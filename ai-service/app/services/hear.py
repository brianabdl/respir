import numpy as np

from app.config import Settings
from app.errors import ModelNotAvailable

CLIP_SAMPLES = 32000


class HearEmbedder:
    name = "hear"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None
        self._device = "cpu"

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        try:
            from transformers import AutoModel
        except ImportError as exc:
            raise ModelNotAvailable(
                "hear", "install the ml extras with: uv sync --extra ml"
            ) from exc

        from app.ml.device import detect_device

        try:
            self._device = detect_device(self._settings.ai_device)

            kwargs: dict = {}

            if self._settings.hf_token:
                kwargs["token"] = self._settings.hf_token

            if self._settings.model_cache_dir:
                kwargs["cache_dir"] = self._settings.model_cache_dir

            self._model = (
                AutoModel.from_pretrained(self._settings.hear_model, **kwargs)
                .to(self._device)
                .eval()
            )
        except Exception as exc:
            self._model = None
            raise ModelNotAvailable("hear", str(exc)[:300]) from exc

    def embed(self, waveform: np.ndarray) -> list[float]:
        if self._model is None:
            self.load()

        import torch

        from app.services.hear_preprocess import preprocess_audio

        samples = np.asarray(waveform, dtype=np.float32).reshape(-1)

        if samples.size == 0:
            return []

        vectors: list[np.ndarray] = []

        for start in range(0, samples.size, CLIP_SAMPLES):
            window = samples[start : start + CLIP_SAMPLES]

            if window.size < CLIP_SAMPLES:
                window = np.pad(window, (0, CLIP_SAMPLES - window.size))

            tensor = torch.from_numpy(window).unsqueeze(0).to(self._device)

            with torch.no_grad():
                output = self._model(
                    preprocess_audio(tensor),
                    return_dict=True,
                    output_hidden_states=True,
                )

            pooled = getattr(output, "pooler_output", None)

            if pooled is None:
                raise ModelNotAvailable("hear", "model returned no pooled output")

            vectors.append(pooled.squeeze(0).float().cpu().numpy())

        mean = np.stack(vectors).mean(axis=0)

        return [float(value) for value in mean]

    def close(self) -> None:
        self._model = None
