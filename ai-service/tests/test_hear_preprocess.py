import pytest

torch = pytest.importorskip("torch")

from app.services.hear_preprocess import CLIP_SAMPLES, preprocess_audio  # noqa: E402


def test_preprocess_audio_produces_expected_spectrogram_shape():
    result = preprocess_audio(torch.zeros(1, CLIP_SAMPLES))

    assert tuple(result.shape) == (1, 1, 192, 128)


def test_preprocess_audio_pads_short_clips():
    result = preprocess_audio(torch.zeros(1, CLIP_SAMPLES // 2))

    assert tuple(result.shape) == (1, 1, 192, 128)


def test_preprocess_audio_rejects_long_clips():
    with pytest.raises(ValueError):
        preprocess_audio(torch.zeros(1, CLIP_SAMPLES + 1))
