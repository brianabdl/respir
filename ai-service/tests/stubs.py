import numpy as np

from app.errors import MedGemmaUnavailable, ModelNotAvailable
from app.schemas.models import ModelState
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


class StubGate:
    name = "cough_gate"
    is_loaded = True

    def load(self) -> None:
        pass

    def predict(self, embedding: list[float]) -> tuple[bool, float]:
        return (True, 0.93)


class NonCoughGate(StubGate):
    def predict(self, embedding: list[float]) -> tuple[bool, float]:
        return (False, 0.12)


class UntrainedGate(StubGate):
    is_loaded = False

    def predict(self, embedding: list[float]) -> tuple[bool, float]:
        raise ModelNotAvailable("cough_gate", "no trained gate")


class StubEmbedder:
    name = "embeddings"
    is_loaded = True

    def load(self) -> None:
        pass

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [[0.5] * 768 for _ in texts]


class StubRegistry:
    def __init__(self, hear: StubHear | None = None, gate: StubGate | None = None) -> None:
        self._hear = hear or StubHear()
        self._classifier = StubClassifier()
        self._embeddings = StubEmbedder()
        self._gate = gate or StubGate()

    def device(self) -> str:
        return "cpu"

    def hear(self) -> StubHear:
        return self._hear

    def classifier(self) -> StubClassifier:
        return self._classifier

    def text_embeddings(self) -> StubEmbedder:
        return self._embeddings

    def gate(self) -> StubGate:
        return self._gate

    def load(self, name: str) -> None:
        pass

    def states(self) -> dict[str, ModelState]:
        return {
            "hear": ModelState(name="hear", loaded=self._hear.is_loaded),
            "classifier": ModelState(name="classifier", loaded=True),
            "embeddings": ModelState(name="embeddings", loaded=True),
            "gate": ModelState(name="gate", loaded=self._gate.is_loaded),
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
