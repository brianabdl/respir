import pytest

from app.services.audio import AudioDecodeError, decode_to_mono_16k, duration_seconds


def test_decode_resamples_stereo_44k_to_mono_16k(wav_bytes):
    waveform = decode_to_mono_16k(wav_bytes)

    assert waveform.ndim == 1
    assert len(waveform) == pytest.approx(16_000, abs=200)
    assert duration_seconds(waveform) == pytest.approx(1.0, abs=0.05)


def test_decode_rejects_non_audio_bytes():
    with pytest.raises(AudioDecodeError):
        decode_to_mono_16k(b"definitely not audio")
