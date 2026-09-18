import io
import subprocess

import numpy as np
import soundfile as sf

SAMPLE_RATE = 16_000


class AudioDecodeError(Exception):
    pass


class NoCoughDetected(Exception):
    pass


#: Conservative loudness floor for a usable cough recording. Only rejects
#: near-silence (room tone with no audible event); quiet but real coughs
#: pass. Forced coughs close to the microphone typically measure 0.05+ RMS.
MIN_AUDIBLE_RMS = 0.01

#: Minimum share of samples above SUSTAINED_LEVEL. A real screening sample
#: must contain sustained loud events (cough bursts), not just a brief bump
#: or a second of room noise inside an otherwise quiet clip. Calibrated on
#: one real cough clip (0.74) vs three silent-room recordings (max 0.07) —
#: heuristic, revisit with a labelled validation set.
SUSTAINED_LEVEL = 0.05
MIN_SUSTAINED_FRACTION = 0.10


def ensure_audible(waveform: np.ndarray) -> float:
    """Reject recordings with no real cough event before expensive inference.

    Returns the RMS level so callers can log it. Raises NoCoughDetected
    when the clip is near-silent or lacks sustained loud events — without
    this gate, room noise or mic bumps reach the TB classifier, which was
    only trained on real coughs and answers with a spurious medium/high
    risk.
    """
    if waveform.size == 0:
        raise NoCoughDetected("The recording contains no audio samples.")

    rms = float(np.sqrt(np.mean(np.square(waveform, dtype=np.float64))))

    if rms < MIN_AUDIBLE_RMS:
        raise NoCoughDetected(
            f"The recording is near-silent (RMS {rms:.4f}, floor {MIN_AUDIBLE_RMS})."
        )

    sustained = float((np.abs(waveform) >= SUSTAINED_LEVEL).mean())

    if sustained < MIN_SUSTAINED_FRACTION:
        raise NoCoughDetected(
            f"The recording has no sustained cough event "
            f"(loud fraction {sustained:.3f}, minimum {MIN_SUSTAINED_FRACTION})."
        )

    return rms


#: Burst detector tuning. A cough expulsion is a loud transient of roughly
#: 200-500 ms; anything much shorter is a mic bump or a door slam, not a
#: cough. Thresholds are heuristic — recalibrate on labelled field clips
#: (see the sustained-gate note above).
BURST_FRAME_MS = 20
BURST_THRESHOLD_K = 3.0
BURST_MIN_MS = 120
BURST_MAX_GAP_MS = 200
BURST_PAD_MS = 150
#: Absolute loudness floor for a burst. Room tone sits well below this, so a
#: silent clip yields zero segments even though its MAD is also ~zero.
BURST_MIN_RMS = 0.025
#: Silence stitched between kept bursts when rejoining them.
JOIN_GAP_SECONDS = 0.15

#: Spectral-gate tuning. The gate keeps time-frequency bins louder than
#: GATE_THRESHOLD_K times the room-noise profile and attenuates the rest
#: to GATE_FLOOR (soft floor: fewer musical artifacts than binary zero).
#: Conservative on purpose — a gate that is too aggressive eats quiet
#: cough onsets, which is worse than leaving some hum behind.
GATE_FRAME_MS = 32
GATE_HOP_MS = 8
GATE_THRESHOLD_K = 2.0
GATE_FLOOR = 0.15
GATE_MIN_NOISE_FRAMES = 3


def detect_cough_bursts(
    waveform: np.ndarray, sample_rate: int = SAMPLE_RATE
) -> list[tuple[int, int]]:
    """Isolate cough bursts so only cough audio reaches inference.

    Splits the waveform into 20 ms frames and flags frames louder than an
    adaptive threshold (median + K * MAD, floored at BURST_MIN_RMS). Active
    runs separated by short gaps are merged, padded, and returned as
    ``(start, end)`` sample indices. Clips shorter than BURST_MIN_MS are
    dropped as mic bumps, not coughs.

    Silence or room tone yields an empty list — the caller should treat
    that exactly like NoCoughDetected.
    """
    samples = np.asarray(waveform, dtype=np.float32).reshape(-1)

    if samples.size == 0:
        return []

    frame_size = max(1, int(sample_rate * BURST_FRAME_MS / 1000))
    n_frames = (samples.size + frame_size - 1) // frame_size
    padded = np.pad(samples, (0, n_frames * frame_size - samples.size))
    frames = padded.reshape(n_frames, frame_size)
    energy = np.sqrt(np.mean(np.square(frames, dtype=np.float64), axis=1))

    median = float(np.median(energy))
    mad = float(np.median(np.abs(energy - median)))

    # A uniformly loud clip (sustained tone, close-mic cough filling the
    # whole recording) has no quiet reference frames, so the adaptive
    # threshold below would sit at the signal level itself and shred it
    # into fragments. Such a clip IS the burst — keep it whole.
    if float(np.percentile(energy, 10)) > 3 * BURST_MIN_RMS:
        return [(0, samples.size)]

    threshold = max(median + BURST_THRESHOLD_K * mad, BURST_MIN_RMS)

    active = energy >= threshold

    min_frames = max(1, int(BURST_MIN_MS / BURST_FRAME_MS))
    max_gap = max(0, int(BURST_MAX_GAP_MS / BURST_FRAME_MS))
    pad = int(BURST_PAD_MS / BURST_FRAME_MS)

    segments: list[tuple[int, int]] = []
    start: int | None = None
    gap = 0

    for index, is_active in enumerate(active):
        if is_active:
            if start is None:
                start = index

            gap = 0
        elif start is not None:
            gap += 1

            if gap > max_gap:
                end = index - gap
                segments.append((start, end))
                start = None
                gap = 0

    if start is not None:
        segments.append((start, n_frames - 1))

    bursts: list[tuple[int, int]] = []

    for frame_start, frame_end in segments:
        if frame_end - frame_start + 1 < min_frames:
            continue

        sample_start = max(0, (frame_start - pad) * frame_size)
        sample_end = min(samples.size, (frame_end + 1 + pad) * frame_size)

        if sample_end > sample_start:
            bursts.append((sample_start, sample_end))

    return bursts


def join_segments(
    waveform: np.ndarray,
    segments: list[tuple[int, int]],
    gap_seconds: float = JOIN_GAP_SECONDS,
    sample_rate: int = SAMPLE_RATE,
) -> np.ndarray:
    """Stitch kept bursts into one compact clip for a single embedding pass.

    Long silences between bursts are replaced with a short neutral gap so
    the embedding is not diluted by minutes of room tone while the natural
    burst onsets are preserved.
    """
    samples = np.asarray(waveform, dtype=np.float32).reshape(-1)
    gap = np.zeros(max(0, int(gap_seconds * sample_rate)), dtype=np.float32)

    parts: list[np.ndarray] = []

    for start, end in segments:
        if parts:
            parts.append(gap)

        parts.append(samples[start:end])

    if not parts:
        return np.asarray([], dtype=np.float32)

    return np.concatenate(parts)


def _stft_frames(
    samples: np.ndarray, frame_size: int, hop: int
) -> tuple[np.ndarray, np.ndarray]:
    """Hann-windowed complex spectrogram frames (rows) for a mono clip."""
    if samples.size < frame_size:
        samples = np.pad(samples, (0, frame_size - samples.size))

    count = 1 + (samples.size - frame_size) // hop
    window = np.hanning(frame_size + 1)[:-1].astype(np.float64)
    frames = np.stack(
        [samples[i * hop : i * hop + frame_size] * window for i in range(count)]
    )

    return np.fft.rfft(frames, axis=1), window


def _overlap_add(frames: np.ndarray, window: np.ndarray, hop: int, size: int) -> np.ndarray:
    """Inverse of _stft_frames with weighted overlap-add normalization.

    The normalization floor is relative to the interior overlap constant:
    at the clip edges the window coverage is near-zero, and dividing
    spectrally-modified frames by a ~1e-9 norm would amplify rounding
    smear into loud pops. Edge samples are left as the raw overlap sum
    (a few-ms fade) instead.
    """
    frame_size = window.shape[0]
    out = np.zeros(size, dtype=np.float64)
    norm = np.zeros(size, dtype=np.float64)

    for index, frame in enumerate(frames):
        start = index * hop
        out[start : start + frame_size] += frame * window
        norm[start : start + frame_size] += window**2

    healthy = norm > max(float(norm.max()) * 1e-3, 1e-8)
    out[healthy] /= norm[healthy]

    return out.astype(np.float32)


def estimate_noise_profile(
    waveform: np.ndarray,
    segments: list[tuple[int, int]],
    sample_rate: int = SAMPLE_RATE,
) -> np.ndarray | None:
    """Average magnitude spectrum of the non-burst regions of a clip.

    The regions the burst detector discarded are a free, perfectly matched
    sample of the current room noise — same mic, same room, same seconds.
    Returns None when too few noise frames exist (uniformly loud clip),
    in which case the caller must skip gating rather than guess.
    """
    samples = np.asarray(waveform, dtype=np.float32).reshape(-1)

    if samples.size == 0:
        return None

    frame_size = max(1, int(sample_rate * GATE_FRAME_MS / 1000))
    hop = max(1, int(sample_rate * GATE_HOP_MS / 1000))
    spectra, _ = _stft_frames(samples, frame_size, hop)

    kept = np.zeros(spectra.shape[0], dtype=bool)

    for start, end in segments:
        first = max(0, start // hop)
        last = min(spectra.shape[0] - 1, end // hop)
        kept[first : last + 1] = True

    noise = np.abs(spectra[~kept])

    if noise.shape[0] < GATE_MIN_NOISE_FRAMES:
        return None

    return noise.mean(axis=0).astype(np.float32)


def spectral_gate(
    clip: np.ndarray,
    noise_profile: np.ndarray,
    sample_rate: int = SAMPLE_RATE,
) -> np.ndarray:
    """Attenuate room-noise bins in a clip, keeping loud bins intact."""
    samples = np.asarray(clip, dtype=np.float32).reshape(-1)

    if samples.size == 0:
        return samples

    frame_size = max(1, int(sample_rate * GATE_FRAME_MS / 1000))
    hop = max(1, int(sample_rate * GATE_HOP_MS / 1000))
    spectra, window = _stft_frames(samples, frame_size, hop)

    magnitude = np.abs(spectra)
    phase = np.exp(1j * np.angle(spectra))
    reference = np.maximum(noise_profile.astype(np.float64), 1e-8)
    mask = np.where(magnitude >= GATE_THRESHOLD_K * reference, 1.0, GATE_FLOOR)

    gated = (magnitude * mask * phase).astype(np.complex128)
    time_frames = np.fft.irfft(gated, n=frame_size, axis=1)

    return _overlap_add(time_frames, window, hop, samples.size)


def denoise_clip(
    waveform: np.ndarray,
    segments: list[tuple[int, int]],
    sample_rate: int = SAMPLE_RATE,
) -> np.ndarray:
    """Join kept bursts, then gate room noise profiled from dropped regions.

    Falls back to the plain join when the clip has no usable noise-only
    regions (no profile, no guessing).
    """
    clip = join_segments(waveform, segments)

    if clip.size == 0:
        return clip

    profile = estimate_noise_profile(waveform, segments, sample_rate)

    if profile is None:
        return clip

    return spectral_gate(clip, profile, sample_rate)


def decode_to_mono_16k(data: bytes, timeout_s: int = 30) -> np.ndarray:
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                "pipe:0",
                "-f",
                "wav",
                "-ac",
                "1",
                "-ar",
                str(SAMPLE_RATE),
                "pipe:1",
            ],
            input=data,
            capture_output=True,
            timeout=timeout_s,
            check=False,
        )
    except FileNotFoundError as exc:
        raise AudioDecodeError("ffmpeg is not installed on this host.") from exc
    except subprocess.TimeoutExpired as exc:
        raise AudioDecodeError("Audio decoding timed out.") from exc

    if result.returncode != 0 or not result.stdout:
        detail = result.stderr.decode(errors="replace").strip()[:300]
        raise AudioDecodeError(f"Could not decode audio: {detail or 'empty stream'}")

    waveform, _ = sf.read(io.BytesIO(result.stdout), dtype="float32", always_2d=False)

    if isinstance(waveform, np.ndarray) and waveform.ndim > 1:
        waveform = waveform.mean(axis=1)

    return np.asarray(waveform, dtype=np.float32)


def duration_seconds(waveform: np.ndarray) -> float:
    return round(len(waveform) / SAMPLE_RATE, 3)
