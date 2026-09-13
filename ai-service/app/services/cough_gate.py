from app.config import Settings
from app.errors import ModelNotAvailable


class CoughGate:
    """Personal cough-vs-other gate over HeAR embeddings.

    A tiny logistic regression trained on the operator's own clips
    (scripts/train_cough_gate.py). Runs after HeAR embedding and before
    the TB classifier: speech, music, or background noise is rejected
    here instead of receiving a spurious TB risk level. When no trained
    gate exists, loading raises ModelNotAvailable and callers skip the
    gate (previous behavior).
    """

    name = "cough_gate"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        try:
            import joblib
        except ImportError as exc:
            raise ModelNotAvailable(
                "cough_gate", "install the ml extras with: uv sync --extra ml"
            ) from exc

        path = self._settings.cough_gate_path

        if not path.exists():
            raise ModelNotAvailable(
                "cough_gate",
                f"no trained gate at {path}; run scripts/train_cough_gate.py",
            )

        try:
            self._model = joblib.load(path)["model"]
        except Exception as exc:
            self._model = None
            raise ModelNotAvailable("cough_gate", str(exc)[:300]) from exc

    def predict(self, embedding: list[float]) -> tuple[bool, float]:
        if self._model is None:
            self.load()

        import numpy as np

        vector = np.asarray(embedding, dtype=np.float32).reshape(1, -1)
        score = float(self._model.predict_proba(vector)[0, 1])

        return score >= self._settings.cough_gate_threshold, score

    def close(self) -> None:
        self._model = None
