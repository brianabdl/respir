import numpy as np

from app.errors import MedGemmaUnavailable, ModelNotAvailable
from app.schemas.models import ModelState
from app.services.anemia import AnemiaPrediction
from app.services.explanations import template_briefing


class StubHear:
    name = "hear"
    is_loaded = True

    def load(self) -> None:
        pass

    def embed(self, waveform: np.ndarray) -> list[float]:
        return [0.1] * 512


class UnavailableHear(StubHear):
    is_loaded = False

    def embed(self, waveform: np.ndarray) -> list[float]:
        raise ModelNotAvailable("hear", "weights are not present")


class StubClassifier:
    name = "classifier"
    is_loaded = True

    def load(self) -> None:
        pass

    def predict(self, embedding: list[float]) -> tuple[str, float]:
        return ("high", 0.91)


class StubEmbedder:
    name = "embeddings"
    is_loaded = True

    def load(self) -> None:
        pass

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [[0.5] * 768 for _ in texts]


class StubAnemia:
    name = "anemia"
    is_loaded = True

    def load(self) -> None:
        pass

    def predict(self, part: str, image) -> AnemiaPrediction:
        return AnemiaPrediction(
            part=part,  # type: ignore[arg-type]
            probability=0.8,
            threshold=0.3,
            label="Anemia",
            risk_level="high",
            model_name=f"stub-{part}",
            model_version="stub-1",
        )

    def model_name(self, part: str) -> str:
        return f"stub-{part}"

    def model_version(self, part: str) -> str:
        return "stub-1"


class UnavailableAnemia(StubAnemia):
    is_loaded = False

    def predict(self, part: str, image) -> AnemiaPrediction:
        raise ModelNotAvailable(f"anemia_{part}", "weights are not present")


class StubRegistry:
    def __init__(self, hear: StubHear | None = None, anemia: StubAnemia | None = None) -> None:
        self._hear = hear or StubHear()
        self._classifier = StubClassifier()
        self._embeddings = StubEmbedder()
        self._anemia = anemia or StubAnemia()

    def device(self) -> str:
        return "cpu"

    def hear(self) -> StubHear:
        return self._hear

    def classifier(self) -> StubClassifier:
        return self._classifier

    def text_embeddings(self) -> StubEmbedder:
        return self._embeddings

    def anemia(self) -> StubAnemia:
        return self._anemia

    def load(self, name: str) -> None:
        pass

    def states(self) -> dict[str, ModelState]:
        return {
            "hear": ModelState(name="hear", loaded=self._hear.is_loaded),
            "classifier": ModelState(name="classifier", loaded=True),
            "embeddings": ModelState(name="embeddings", loaded=True),
            "anemia": ModelState(name="anemia", loaded=self._anemia.is_loaded),
        }


class StubMedGemma:
    mode = "fake"

    def explain_cough(
        self, risk_level: str, risk_score: float | None, duration_s: float
    ) -> tuple[str, str]:
        return ("stub findings", "stub recommendation")

    def brief(self, request):
        return template_briefing(request, generated_by="stub").model_copy(
            update={"degraded": False}
        )


class UnavailableMedGemma(StubMedGemma):
    def explain_cough(
        self, risk_level: str, risk_score: float | None, duration_s: float
    ) -> tuple[str, str]:
        raise MedGemmaUnavailable("endpoint is not configured")

    def brief(self, request):
        raise MedGemmaUnavailable("endpoint is not configured")
