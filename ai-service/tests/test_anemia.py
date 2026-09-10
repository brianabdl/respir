import io

from fastapi.testclient import TestClient
from PIL import Image

from tests.conftest import build_client
from tests.stubs import StubRegistry, UnavailableAnemia

TOKEN_HEADERS = {"X-Internal-Token": "test-token"}


def png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 150, 150)).save(buffer, format="PNG")

    return buffer.getvalue()


def test_anemia_analysis_returns_screening_result():
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/vision/anemia",
            headers=TOKEN_HEADERS,
            data={"part": "palm"},
            files={"image": ("palm.png", png_bytes(), "image/png")},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["part"] == "palm"
    assert payload["risk_level"] == "high"
    assert payload["risk_score"] == 0.8
    assert payload["prediction"] == "Anemia"
    assert payload["threshold"] == 0.3
    assert payload["model"]["available"] is True
    assert payload["findings"]


def test_anemia_analysis_degrades_when_model_is_unavailable():
    registry = StubRegistry(anemia=UnavailableAnemia())

    with TestClient(build_client(registry=registry)) as client:
        response = client.post(
            "/v1/vision/anemia",
            headers=TOKEN_HEADERS,
            data={"part": "eye"},
            files={"image": ("eye.png", png_bytes(), "image/png")},
        )

    assert response.status_code == 200
    payload = response.json()

    assert payload["part"] == "eye"
    assert payload["risk_level"] == "unclear"
    assert payload["risk_score"] is None
    assert payload["model"]["available"] is False


def test_anemia_analysis_rejects_invalid_image():
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/vision/anemia",
            headers=TOKEN_HEADERS,
            data={"part": "nail"},
            files={"image": ("nail.png", b"not-an-image", "image/png")},
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_image"


def test_anemia_analysis_rejects_unknown_part():
    with TestClient(build_client()) as client:
        response = client.post(
            "/v1/vision/anemia",
            headers=TOKEN_HEADERS,
            data={"part": "beard"},
            files={"image": ("palm.png", png_bytes(), "image/png")},
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"
