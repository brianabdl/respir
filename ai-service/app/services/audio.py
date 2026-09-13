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
