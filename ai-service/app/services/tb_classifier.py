from app.config import Settings
from app.errors import ModelNotAvailable
from app.schemas.models import RiskLevel

HIGH_THRESHOLD = 0.66
MEDIUM_THRESHOLD = 0.33


class TbClassifier:
    name = "tb_classifier"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None
        self._device = "cpu"

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        try:
            from transformers import AutoModelForSequenceClassification
        except ImportError as exc:
            raise ModelNotAvailable(
                "tb_classifier", "install the ml extras with: uv sync --extra ml"
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
                AutoModelForSequenceClassification.from_pretrained(
                    self._settings.tb_classifier_model, **kwargs
                )
                .to(self._device)
                .eval()
            )
        except Exception as exc:
            self._model = None
            raise ModelNotAvailable("tb_classifier", str(exc)[:300]) from exc

    def predict(self, embedding: list[float]) -> tuple[RiskLevel, float]:
        if self._model is None:
            self.load()

        import torch

        tensor = torch.tensor([embedding], dtype=torch.float32).to(self._device)

        with torch.no_grad():
            logits = self._model(tensor).logits.squeeze(0)

        score = self._score(logits)

        return self._risk(score), score

    @staticmethod
    def _score(logits) -> float:
        import torch

        if logits.numel() == 1:
            return float(torch.sigmoid(logits).item())

        probabilities = torch.softmax(logits, dim=-1)

        return float(probabilities[-1].item())

    @staticmethod
    def _risk(score: float) -> RiskLevel:
        if score >= HIGH_THRESHOLD:
            return "high"

        if score >= MEDIUM_THRESHOLD:
            return "medium"

        return "low"

    def close(self) -> None:
        self._model = None
