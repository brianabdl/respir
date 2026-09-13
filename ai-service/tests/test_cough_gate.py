import numpy as np
import pytest

from app.config import Settings
from app.errors import ModelNotAvailable
from app.services.cough_gate import CoughGate


class FakeGateModel:
    def __init__(self, probability: float) -> None:
        self._probability = probability

    def predict_proba(self, vector):
        return np.asarray([[1.0 - self._probability, self._probability]])


def gate_with(probability: float, threshold: float = 0.5) -> CoughGate:
    gate = CoughGate(Settings(_env_file=None, cough_gate_threshold=threshold))
    gate._model = FakeGateModel(probability)

    return gate


def test_predict_accepts_above_threshold():
    is_cough, score = gate_with(0.8).predict([0.1] * 512)

    assert is_cough is True
    assert score == pytest.approx(0.8)


def test_predict_rejects_below_threshold():
    is_cough, score = gate_with(0.2).predict([0.1] * 512)

    assert is_cough is False
    assert score == pytest.approx(0.2)


def test_predict_without_trained_model_raises():
    gate = CoughGate(Settings(_env_file=None, cough_gate_model="models/does-not-exist.joblib"))

    with pytest.raises(ModelNotAvailable):
        gate.predict([0.1] * 512)
