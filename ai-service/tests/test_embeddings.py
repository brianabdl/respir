from fastapi.testclient import TestClient

from app.config import get_settings
from tests.conftest import build_client

TOKEN_HEADERS = {"X-Internal-Token": "test-token"}


def test_text_embeddings_returns_vectors():
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/embeddings/text",
            headers=TOKEN_HEADERS,
            json={"texts": ["cough for three weeks", "night sweats"]},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["dim"] == 768
    assert len(payload["embeddings"]) == 2
    assert len(payload["embeddings"][0]) == 768


def test_text_embeddings_rejects_empty_input():
    with TestClient(build_client()) as client:
        response = client.post("/v1/embeddings/text", headers=TOKEN_HEADERS, json={"texts": []})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_audio_embeddings_returns_hear_vector(wav_bytes):
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/embeddings/audio",
            headers=TOKEN_HEADERS,
            files={"audio": ("cough.wav", wav_bytes, "audio/wav")},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["dim"] == 512
    assert len(payload["embedding"]) == 512
    assert payload["model"] == get_settings().hear_model


def test_vision_endpoint_is_not_implemented():
    with TestClient(build_client()) as client:
        response = client.post("/v1/vision/analyze", headers=TOKEN_HEADERS)

    assert response.status_code == 501
    assert response.json()["error"]["code"] == "not_implemented"
