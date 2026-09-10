from fastapi.testclient import TestClient

from tests.conftest import build_client
from tests.stubs import StubRegistry, UnavailableHear

TOKEN_HEADERS = {"X-Internal-Token": "test-token"}


def test_health_reports_models_and_vertex_state():
    with TestClient(build_client()) as client:
        response = client.get("/v1/health", headers=TOKEN_HEADERS)

    assert response.status_code == 200
    payload = response.json()

    assert payload["status"] == "ok"
    assert payload["device"] == "cpu"
    assert set(payload["models"].keys()) == {"hear", "classifier", "embeddings", "anemia"}
    assert payload["models"]["hear"]["loaded"] is True
    assert payload["vertex"] == {
        "configured": False,
        "mode": "fake",
        "model": "medgemma-4b-it",
    }


def test_health_without_token_is_unauthorized():
    with TestClient(build_client()) as client:
        response = client.get("/v1/health")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_health_with_wrong_token_is_unauthorized():
    with TestClient(build_client()) as client:
        response = client.get("/v1/health", headers={"X-Internal-Token": "wrong"})

    assert response.status_code == 401


def test_health_reports_degraded_when_a_model_is_unloaded():
    registry = StubRegistry(hear=UnavailableHear())

    with TestClient(build_client(registry=registry)) as client:
        response = client.get("/v1/health", headers=TOKEN_HEADERS)

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
