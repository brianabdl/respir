from app.config import Settings
from app.ml.device import detect_device
from app.schemas.models import ModelState
from app.services.hear import HearEmbedder
from app.services.tb_classifier import TbClassifier
from app.services.text_embeddings import TextEmbedder


class ModelRegistry:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._device = detect_device(settings.ai_device)
        self._adapters = {
            "hear": HearEmbedder(settings),
            "classifier": TbClassifier(settings),
            "embeddings": TextEmbedder(settings),
        }

    def device(self) -> str:
        return self._device

    def hear(self) -> HearEmbedder:
        return self._adapters["hear"]

    def classifier(self) -> TbClassifier:
        return self._adapters["classifier"]

    def text_embeddings(self) -> TextEmbedder:
        return self._adapters["embeddings"]

    def load(self, name: str) -> None:
        adapter = self._adapters.get(name)

        if adapter is None:
            return

        adapter.load()

    def states(self) -> dict[str, ModelState]:
        return {
            name: ModelState(name=adapter.name, loaded=adapter.is_loaded)
            for name, adapter in self._adapters.items()
        }
