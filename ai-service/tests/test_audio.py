import numpy as np
import pytest

from app.services.audio import (
    AudioDecodeError,
    NoCoughDetected,
    decode_to_mono_16k,
    duration_seconds,
    ensure_audible,
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
