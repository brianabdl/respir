from fastapi.testclient import TestClient

from tests.conftest import build_client
from tests.stubs import UnavailableMedGemma

TOKEN_HEADERS = {"X-Internal-Token": "test-token"}

BRIEFING_PAYLOAD = {
    "subject_token": "PATIENT_A",
    "age": 34,
    "sex": "female",
    "risk_factors": ["smoking"],
    "transcript": [
        {"role": "assistant", "text": "How are you feeling?"},
        {"role": "user", "text": "I have had a cough for three weeks."},
    ],
    "cough": {
        "risk_level": "high",
        "findings": "Harsh cough",
        "recommendation": "See doctor",
    },
    "anemia": [
        {
            "part": "palm",
            "risk_level": "high",
            "risk_score": 0.82,
            "findings": "Pallor pattern detected",
        }
    ],
}


def test_briefing_returns_structured_report():
    with TestClient(build_client()) as client:
        response = client.post("/v1/briefing", headers=TOKEN_HEADERS, json=BRIEFING_PAYLOAD)

    assert response.status_code == 200
    payload = response.json()

    assert payload["degraded"] is False
    assert payload["generated_by"] == "stub"
    assert payload["chief_complaint"]
    assert payload["disclaimer"]


def test_briefing_degrades_when_medgemma_is_unavailable():
    with TestClient(build_client(medgemma=UnavailableMedGemma())) as client:
        response = client.post("/v1/briefing", headers=TOKEN_HEADERS, json=BRIEFING_PAYLOAD)

    assert response.status_code == 200
    payload = response.json()

    assert payload["degraded"] is True
    assert payload["generated_by"] == "template"
    assert payload["cough_findings"] == "Harsh cough"
    assert "palm" in payload["anemia_findings"]
    assert "Pallor pattern detected" in payload["anemia_findings"]


def test_briefing_rejects_identifying_fields():
    payload = {**BRIEFING_PAYLOAD, "name": "Jane Doe", "email": "jane@example.com"}

    with TestClient(build_client()) as client:
        response = client.post("/v1/briefing", headers=TOKEN_HEADERS, json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"


def test_briefing_rejects_identifying_fields_inside_transcript():
    payload = {
        **BRIEFING_PAYLOAD,
        "transcript": [{"role": "user", "text": "hello", "email": "jane@example.com"}],
    }

    with TestClient(build_client()) as client:
        response = client.post("/v1/briefing", headers=TOKEN_HEADERS, json=payload)

    assert response.status_code == 422
