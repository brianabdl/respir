import numpy as np
import pytest

from app.config import Settings
from app.services.tb_classifier import TbClassifier


class FakeModel:
    def __init__(self, probability: float) -> None:
        self._probability = probability

    def predict_proba(self, vector):
        return np.asarray([[1.0 - self._probability, self._probability]])


class FakeScaler:
    def transform(self, vector):
        return vector


def classifier_with(passive: float, forced: float) -> TbClassifier:
    classifier = TbClassifier(Settings())
    classifier._package = {
        "model_p": FakeModel(passive),
        "model_f": FakeModel(forced),
        "scaler_p": FakeScaler(),
        "scaler_f": FakeScaler(),
    }

    return classifier


def test_predict_averages_passive_and_forced_heads():
    risk, score = classifier_with(0.8, 0.6).predict([0.1] * 512)

    assert score == pytest.approx(0.7)
    assert risk == "high"


def test_predict_maps_medium_and_low_bands():
    assert classifier_with(0.4, 0.4).predict([0.1] * 512)[0] == "medium"
    assert classifier_with(0.1, 0.2).predict([0.1] * 512)[0] == "low"
