from app.schemas.models import AnemiaPart, BriefingRequest, BriefingResponse, RiskLevel

DISCLAIMER = (
    "This summary is generated to support, not replace, a clinician assessment. "
    "An in-person evaluation is required for any diagnosis."
)

FALLBACK_EXPLANATIONS: dict[RiskLevel, tuple[str, str]] = {
    "low": (
        "The recorded cough was brief and clear with no obvious pathological features "
        "detected by the acoustic analysis.",
        "If the cough persists beyond two weeks or is accompanied by fever, weight loss, "
        "or night sweats, arrange a clinical review.",
    ),
    "medium": (
        "The recorded cough was prolonged or harsh, which warrants a clinical assessment.",
        "Book a primary-care review for a symptom history and, if indicated, chest imaging "
        "or sputum testing.",
    ),
    "high": (
        "The recorded cough showed features acoustically associated with serious respiratory "
        "disease, including possible TB presentations.",
        "Prioritise an urgent clinical assessment and consider TB screening (sputum testing "
        "and chest imaging) per local protocol.",
    ),
    "unclear": (
        "The cough sample could not be analysed reliably, so no acoustic conclusion was drawn.",
        "Try recording the cough again in a quiet room, and discuss the symptom with the doctor.",
    ),
}


def fallback_explanation(risk_level: RiskLevel) -> tuple[str, str]:
    return FALLBACK_EXPLANATIONS.get(risk_level, FALLBACK_EXPLANATIONS["unclear"])


ANEMIA_LABELS: dict[AnemiaPart, str] = {
    "palm": "palm",
    "eye": "lower-eyelid",
    "nail": "fingernail",
}


def fallback_anemia_explanation(part: AnemiaPart, positive: bool | None) -> tuple[str, str]:
    region = ANEMIA_LABELS.get(part, part)

    if positive is None:
        return (
            f"The {region} image could not be analysed, so no screening conclusion was drawn.",
            "Try capturing the image again in bright, even light, and mention any fatigue or "
            "pallor to the doctor.",
        )

    if positive:
        return (
            f"The {region} image showed colour features that the screening model associates "
            "with low haemoglobin.",
            "Confirm with a blood test (haemoglobin or haematocrit) and a clinical review. "
            "Screening alone cannot diagnose anaemia.",
        )

    return (
        f"The {region} image did not show colour features associated with anaemia in the "
        "screening model.",
        "Screening alone cannot rule out anaemia — mention any fatigue, dizziness or pallor "
        "to the doctor.",
    )


def template_briefing(request: BriefingRequest, generated_by: str = "template") -> BriefingResponse:
    first_user_turn = next(
        (turn.text for turn in request.transcript if turn.role == "user"),
        "No patient statements were captured.",
    )

    cough_findings = (
        request.cough.findings if request.cough is not None else "No cough sample was recorded."
    )

    anemia_findings = (
        "; ".join(
            f"{item.part}: {item.risk_level} ({item.findings})" for item in request.anemia
        )
        if request.anemia
        else "No anemia screening images were captured."
    )

    return BriefingResponse(
        chief_complaint=first_user_turn[:280],
        history=(
            f"{len(request.transcript)} transcript turns were captured for "
            f"{request.subject_token}. Automated history extraction is unavailable."
        ),
        risk_factors=list(request.risk_factors),
        cough_findings=cough_findings,
        anemia_findings=anemia_findings,
        suggested_questions=[
            "Ask the patient to describe the cough and its duration.",
            "Clarify fever, night sweats, weight loss, and fatigue.",
            "Review TB contact history and prior TB episodes.",
        ],
        red_flags=[],
        disclaimer=DISCLAIMER,
        degraded=True,
        generated_by=generated_by,
    )
