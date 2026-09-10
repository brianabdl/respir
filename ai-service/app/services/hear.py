import numpy as np

from app.config import Settings
from app.errors import ModelNotAvailable


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

            kwargs: dict = {"trust_remote_code": True}

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

        tensor = torch.from_numpy(np.asarray(waveform, dtype=np.float32)).unsqueeze(0)
        tensor = tensor.to(self._device)

        with torch.no_grad():
            output = self._model(tensor)

        hidden = getattr(output, "last_hidden_state", output)

        if hasattr(hidden, "dim") and hidden.dim() == 3:
            hidden = hidden.mean(dim=1)

        vector = hidden.squeeze(0).detach().cpu().numpy().astype("float32")

        return [float(value) for value in vector]

    def close(self) -> None:
        self._model = None
