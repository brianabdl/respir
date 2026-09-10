from app.schemas.models import BriefingRequest
from app.services.vertex import build_briefing_prompt, redact_identifiers


def test_redact_identifiers_removes_email_and_phone():
    text = "Contact jane.doe@example.com or +62 812-3456-7890 tomorrow."

    redacted = redact_identifiers(text)

    assert "jane.doe@example.com" not in redacted
    assert "812-3456-7890" not in redacted
    assert redacted.count("[redacted]") == 2


def test_briefing_prompt_never_contains_patient_identifiers():
    request = BriefingRequest(
        subject_token="PATIENT_A",
        transcript=[
            {"role": "user", "text": "Reach me at jane.doe@example.com please"},
            {"role": "assistant", "text": "Understood."},
        ],
    )

    prompt = build_briefing_prompt(request)

    assert "jane.doe@example.com" not in prompt
    assert "[redacted]" in prompt
    assert "PATIENT_A" in prompt


def test_briefing_request_schema_forbids_identity_fields():
    try:
        BriefingRequest(subject_token="PATIENT_A", name="Jane Doe")  # type: ignore[call-arg]
    except Exception as exc:
        assert "name" in str(exc)
    else:
        raise AssertionError("BriefingRequest accepted an identifying field")
