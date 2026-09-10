import json
import logging
import os
import re
from typing import Protocol

from app.config import Settings
from app.errors import MedGemmaUnavailable
from app.schemas.models import BriefingRequest, BriefingResponse, RiskLevel
from app.services.explanations import DISCLAIMER, template_briefing

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")


def redact_identifiers(text: str) -> str:
    return PHONE_RE.sub("[redacted]", EMAIL_RE.sub("[redacted]", text))


def build_cough_prompt(risk_level: RiskLevel, risk_score: float | None, duration_s: float) -> str:
    score = "not available" if risk_score is None else f"{risk_score:.2f}"

    return (
        "You are a clinical decision-support assistant for a pre-visit triage tool. "
        "You do not diagnose and must never claim certainty.\n"
        "An acoustic model analysed a patient cough recording:\n"
        f"- classifier risk level: {risk_level}\n"
        f"- classifier score: {score}\n"
        f"- recording duration: {duration_s} seconds\n\n"
        "Write a short clinical note with two fields:\n"
        '{"findings": "10-30 word description a clinician can skim", '
        '"recommendation": "one concrete next step, including in-person assessment"}\n'
        "Return JSON only."
    )


def build_briefing_prompt(request: BriefingRequest) -> str:
    payload = {
        "subject_token": request.subject_token,
        "age": request.age,
        "sex": request.sex,
        "risk_factors": request.risk_factors,
        "transcript": [turn.model_dump() for turn in request.transcript],
        "cough": request.cough.model_dump() if request.cough is not None else None,
    }

    redacted = redact_identifiers(json.dumps(payload, ensure_ascii=True))

    return (
        "You are a clinical documentation assistant preparing a briefing for a doctor "
        "before a consultation. The patient data below has been de-identified; never ask "
        "for or invent identifying details, and never provide a definitive diagnosis.\n\n"
        f"De-identified consultation data:\n{redacted}\n\n"
        "Return JSON only with exactly these fields:\n"
        '{"chief_complaint": str, "history": str, "risk_factors": [str], '
        '"cough_findings": str, "suggested_questions": [str], "red_flags": [str], '
        f'"disclaimer": "{DISCLAIMER}"}}'
    )


def build_repair_prompt(original_prompt: str, invalid_output: str) -> str:
    return (
        f"{original_prompt}\n\nYour previous response was not valid JSON:\n"
        f"{invalid_output[:500]}\n"
        "Respond again with valid JSON only, no markdown fences, no commentary."
    )


def extract_json(text: str) -> dict:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model output.")

    return json.loads(cleaned[start : end + 1])


class MedGemma(Protocol):
    @property
    def mode(self) -> str: ...

    def explain_cough(
        self, risk_level: RiskLevel, risk_score: float | None, duration_s: float
    ) -> tuple[str, str]: ...

    def brief(self, request: BriefingRequest) -> BriefingResponse: ...


class FakeMedGemma:
    mode = "fake"

    def __init__(self) -> None:
        self.last_prompt: str | None = None

    def explain_cough(
        self, risk_level: RiskLevel, risk_score: float | None, duration_s: float
    ) -> tuple[str, str]:
        self.last_prompt = build_cough_prompt(risk_level, risk_score, duration_s)

        return (
            f"Classifier flagged a {risk_level} acoustic risk pattern over a "
            f"{duration_s}-second recording.",
            "Arrange an in-person clinical assessment to confirm the finding.",
        )

    def brief(self, request: BriefingRequest) -> BriefingResponse:
        self.last_prompt = build_briefing_prompt(request)

        return template_briefing(request, generated_by="fake-medgemma").model_copy(
            update={"degraded": False}
        )


class VertexMedGemma:
    mode = "endpoint"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None

    @property
    def _model_path(self) -> str:
        return (
            f"projects/{self._settings.vertex_project}/locations/"
            f"{self._settings.vertex_location}/endpoints/{self._settings.vertex_endpoint_id}"
        )

    def _ensure_model(self) -> None:
        if self._model is not None:
            return

        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel
        except ImportError as exc:
            raise MedGemmaUnavailable(
                "google-cloud-aiplatform is not installed; run: uv sync --extra vertex"
            ) from exc

        if self._settings.google_application_credentials:
            os.environ.setdefault(
                "GOOGLE_APPLICATION_CREDENTIALS",
                self._settings.google_application_credentials,
            )

        try:
            vertexai.init(
                project=self._settings.vertex_project,
                location=self._settings.vertex_location,
            )
            self._model = GenerativeModel(self._model_path)
        except Exception as exc:
            raise MedGemmaUnavailable(f"Vertex initialisation failed: {exc}") from exc

    def _generate(self, prompt: str) -> str:
        self._ensure_model()

        try:
            response = self._model.generate_content(
                prompt,
                request_options={"timeout": self._settings.vertex_timeout_s},
            )
        except Exception as exc:
            raise MedGemmaUnavailable(f"Vertex prediction failed: {exc}") from exc

        text = getattr(response, "text", None)

        if not text:
            raise MedGemmaUnavailable("Vertex returned an empty response.")

        return text

    def _structured(self, prompt: str) -> dict:
        first = self._generate(prompt)

        try:
            return extract_json(first)
        except (ValueError, json.JSONDecodeError):
            logger.warning("MedGemma returned invalid JSON, retrying once")

        return extract_json(self._generate(build_repair_prompt(prompt, first)))

    def explain_cough(
        self, risk_level: RiskLevel, risk_score: float | None, duration_s: float
    ) -> tuple[str, str]:
        data = self._structured(build_cough_prompt(risk_level, risk_score, duration_s))

        findings = str(data.get("findings", "")).strip()
        recommendation = str(data.get("recommendation", "")).strip()

        if not findings or not recommendation:
            raise MedGemmaUnavailable("MedGemma response was missing required fields.")

        return findings, recommendation

    def brief(self, request: BriefingRequest) -> BriefingResponse:
        data = self._structured(build_briefing_prompt(request))

        return BriefingResponse(
            chief_complaint=str(data.get("chief_complaint", "")),
            history=str(data.get("history", "")),
            risk_factors=[str(item) for item in data.get("risk_factors", [])],
            cough_findings=str(data.get("cough_findings", "")),
            suggested_questions=[str(item) for item in data.get("suggested_questions", [])],
            red_flags=[str(item) for item in data.get("red_flags", [])],
            disclaimer=str(data.get("disclaimer", DISCLAIMER)),
            degraded=False,
            generated_by=self._settings.vertex_medgemma_model,
        )


def build_medgemma(settings: Settings) -> MedGemma:
    if settings.vertex_configured:
        return VertexMedGemma(settings)

    return FakeMedGemma()
