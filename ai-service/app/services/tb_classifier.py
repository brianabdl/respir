import warnings

from app.config import Settings
from app.errors import ModelNotAvailable
from app.schemas.models import RiskLevel

HIGH_THRESHOLD = 0.66
# Calibrated 2026-09-19 on healthy-volunteer takes (scores clustered
# 0.31-0.51): the upstream 0.33 floor overcalled them as medium. Narrowing
# the medium band trades sensitivity for specificity — revalidate on a
# labelled negatives set before clinical use.
MEDIUM_THRESHOLD = 0.55

JOBLIB_FILENAME = "hear_tb_prize_domain_aware.joblib"


class TbClassifier:
    name = "tb_classifier"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._package: dict | None = None

    @property
    def is_loaded(self) -> bool:
        return self._package is not None

    def load(self) -> None:
        try:
            import joblib
            from huggingface_hub import hf_hub_download
        except ImportError as exc:
            raise ModelNotAvailable(
                "tb_classifier", "install the ml extras with: uv sync --extra ml"
            ) from exc

        kwargs: dict = {"token": self._settings.hf_token or None}

        if self._settings.model_cache_dir:
            kwargs["cache_dir"] = self._settings.model_cache_dir

        try:
            path = hf_hub_download(
                self._settings.tb_classifier_model,
                JOBLIB_FILENAME,
                **kwargs,
            )
            # Upstream artifact is a trusted legacy joblib bundle containing
            # XGBoost estimators. Runtime is pinned to the compatible 2.x line;
            # suppress only its expected legacy-serialization warning.
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore",
                    message=".*serialized model.*",
                    category=UserWarning,
                )
                self._package = joblib.load(path)
        except Exception as exc:
            self._package = None
            raise ModelNotAvailable("tb_classifier", str(exc)[:300]) from exc

    def predict(self, embedding: list[float]) -> tuple[RiskLevel, float]:
        if self._package is None:
            self.load()

        vector = self._vectors(embedding)
        scores = [
            self._score(self._package["model_p"], self._package["scaler_p"], vector),
            self._score(self._package["model_f"], self._package["scaler_f"], vector),
        ]
        score = float(sum(scores) / len(scores))

        return self._risk(score), score

    @staticmethod
    def _vectors(embedding: list[float]):
        import numpy as np

        return np.asarray(embedding, dtype=np.float32).reshape(1, -1)

    @staticmethod
    def _score(model, scaler, vector) -> float:
        return float(model.predict_proba(scaler.transform(vector))[0, 1])

    @staticmethod
    def _risk(score: float) -> RiskLevel:
        if score >= HIGH_THRESHOLD:
            return "high"

        if score >= MEDIUM_THRESHOLD:
            return "medium"

        return "low"

    def close(self) -> None:
        self._package = None
