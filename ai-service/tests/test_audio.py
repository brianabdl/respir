import numpy as np
import pytest

from app.services.audio import (
    AudioDecodeError,
    NoCoughDetected,
    decode_to_mono_16k,
    denoise_clip,
    detect_cough_bursts,
    duration_seconds,
    ensure_audible,
    estimate_noise_profile,
    join_segments,
    spectral_gate,
)


def test_decode_resamples_stereo_44k_to_mono_16k(wav_bytes):
    waveform = decode_to_mono_16k(wav_bytes)

    assert waveform.ndim == 1
    assert len(waveform) == pytest.approx(16_000, abs=200)
    assert duration_seconds(waveform) == pytest.approx(1.0, abs=0.05)


def test_decode_rejects_non_audio_bytes():
    with pytest.raises(AudioDecodeError):
        decode_to_mono_16k(b"definitely not audio")


def test_ensure_audible_rejects_silence():
    with pytest.raises(NoCoughDetected):
        ensure_audible(np.zeros(16_000, dtype=np.float32))


def test_ensure_audible_rejects_brief_bump_in_quiet_clip():
    waveform = np.zeros(4 * 16_000, dtype=np.float32)
    waveform[:1_600] = 0.3

    with pytest.raises(NoCoughDetected):
        ensure_audible(waveform)


def test_ensure_audible_accepts_tone(wav_bytes):
    rms = ensure_audible(decode_to_mono_16k(wav_bytes))

    assert rms > 0.1


def test_detect_cough_bursts_rejects_silence_and_empty():
    assert detect_cough_bursts(np.zeros(16_000, dtype=np.float32)) == []
    assert detect_cough_bursts(np.asarray([], dtype=np.float32)) == []


def test_detect_cough_bursts_covers_sustained_tone():
    segments = detect_cough_bursts(np.full(16_000, 0.4, dtype=np.float32))

    assert len(segments) == 1

    start, end = segments[0]
    assert start == 0
    assert end == 16_000


def test_detect_cough_bursts_splits_two_bursts():
    waveform = np.zeros(4 * 16_000, dtype=np.float32)
    waveform[0:4_800] = 0.4
    waveform[32_000:36_800] = 0.4

    segments = detect_cough_bursts(waveform)

    # Padding is int(150 ms / 20 ms) = 7 frames = 2240 samples per side.
    assert segments == [(0, 4_800 + 7 * 320), (32_000 - 7 * 320, 36_800 + 7 * 320)]


def test_detect_cough_bursts_drops_brief_bump_and_quiet_tone():
    bump = np.zeros(4 * 16_000, dtype=np.float32)
    bump[:1_600] = 0.3

    assert detect_cough_bursts(bump) == []
    assert detect_cough_bursts(np.full(16_000, 0.005, dtype=np.float32)) == []


def test_join_segments_stitches_bursts_with_neutral_gap():
    waveform = np.arange(8_000, dtype=np.float32)
    joined = join_segments(waveform, [(0, 1_600), (3_200, 4_800)])

    assert len(joined) == 1_600 + 1_600 + int(0.15 * 16_000)
    assert joined[0] == 0
    assert joined[1_600 + int(0.15 * 16_000)] == 3_200


def test_join_segments_empty_list_gives_empty_clip():
    joined = join_segments(np.zeros(16_000, dtype=np.float32), [])

    assert joined.size == 0


def _noisy_burst_clip() -> np.ndarray:
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 0.05, 2 * 16_000).astype(np.float32)
    time = np.arange(8_000, dtype=np.float32) / 16_000
    noise[16_000:24_000] += (0.4 * np.sin(2 * np.pi * 440 * time)).astype(np.float32)

    return noise


def _region_snr(clip: np.ndarray, loud: slice, quiet: slice) -> float:
    return float(np.mean(np.square(clip[loud]))) / max(
        float(np.mean(np.square(clip[quiet]))), 1e-12
    )


def test_spectral_gate_improves_burst_snr_using_room_profile():
    waveform = _noisy_burst_clip()
    segments = detect_cough_bursts(waveform)

    assert len(segments) == 1

    profile = estimate_noise_profile(waveform, segments)

    assert profile is not None

    gated = spectral_gate(waveform, profile)
    burst, room = slice(16_000, 24_000), slice(0, 8_000)

    assert _region_snr(gated, burst, room) > 2 * _region_snr(waveform, burst, room)


def test_denoise_clip_skips_gating_without_noise_regions():
    waveform = np.full(16_000, 0.4, dtype=np.float32)
    segments = detect_cough_bursts(waveform)

    assert estimate_noise_profile(waveform, segments) is None
    assert np.array_equal(
        denoise_clip(waveform, segments), join_segments(waveform, segments)
    )


def test_denoise_clip_empty_list_gives_empty_clip():
    joined = denoise_clip(np.zeros(16_000, dtype=np.float32), [])

    assert joined.size == 0
