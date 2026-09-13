from fastapi.testclient import TestClient

from tests.conftest import build_client
from tests.stubs import NonCoughGate, StubRegistry, UnavailableHear, UntrainedGate

TOKEN_HEADERS = {"X-Internal-Token": "test-token"}


def test_cough_analysis_returns_classifier_result_and_embedding(wav_bytes):
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/cough/analyze",
            headers=TOKEN_HEADERS,
            files={"audio": ("cough.wav", wav_bytes, "audio/wav")},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["risk_level"] == "high"
    assert payload["risk_score"] == 0.91
    assert payload["findings"] == "stub findings"
    assert payload["recommendation"] == "stub recommendation"
    assert len(payload["embedding"]) == 512
    assert payload["model"]["available"] is True
    assert payload["duration_s"] > 0.9


def test_cough_analysis_without_explanation_uses_template(wav_bytes):
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/cough/analyze",
            headers=TOKEN_HEADERS,
            data={"explain": "false"},
            files={"audio": ("cough.wav", wav_bytes, "audio/wav")},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["risk_level"] == "high"
    assert payload["findings"] != "stub findings"


def test_cough_analysis_rejects_silence_without_calling_models(silence_bytes):
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/cough/analyze",
            headers=TOKEN_HEADERS,
            files={"audio": ("silence.wav", silence_bytes, "audio/wav")},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["risk_level"] == "unclear"
    assert payload["risk_score"] is None
    assert "cough" in payload["findings"].lower()
    assert payload["embedding"] == []
    assert payload["model"]["available"] is True


def test_cough_analysis_rejects_invalid_audio():
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/cough/analyze",
            headers=TOKEN_HEADERS,
            files={"audio": ("cough.webm", b"not-audio", "audio/webm")},
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_audio"


def test_cough_analysis_degrades_when_model_is_unavailable(wav_bytes):
    registry = StubRegistry(hear=UnavailableHear())

    with TestClient(build_client(registry=registry)) as client:
        response = client.post(
            "/v1/cough/analyze",
            headers=TOKEN_HEADERS,
            files={"audio": ("cough.wav", wav_bytes, "audio/wav")},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["risk_level"] == "unclear"
    assert payload["risk_score"] is None
    assert payload["embedding"] == []
    assert payload["model"]["available"] is False


def test_cough_analysis_rejects_sample_gate_flags_as_non_cough(wav_bytes):
    registry = StubRegistry(gate=NonCoughGate())

    with TestClient(build_client(registry=registry)) as client:
        response = client.post(
            "/v1/cough/analyze",
            headers=TOKEN_HEADERS,
            files={"audio": ("speech.wav", wav_bytes, "audio/wav")},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["risk_level"] == "unclear"
    assert payload["risk_score"] is None
    assert "cough" in payload["findings"].lower()
    assert payload["embedding"] == []
    assert payload["model"]["available"] is True


def test_cough_analysis_skips_gate_when_untrained(wav_bytes):
    registry = StubRegistry(gate=UntrainedGate())

    with TestClient(build_client(registry=registry)) as client:
        response = client.post(
            "/v1/cough/analyze",
            headers=TOKEN_HEADERS,
            files={"audio": ("cough.wav", wav_bytes, "audio/wav")},
        )

    assert response.status_code == 200
    assert response.json()["risk_level"] == "high"
