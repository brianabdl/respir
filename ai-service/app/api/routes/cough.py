import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.config import get_settings
from app.deps import get_medgemma, get_registry
from app.errors import MedGemmaUnavailable, ModelNotAvailable, ServiceError
from app.ml.registry import ModelRegistry
from app.schemas.models import CoughAnalysisResponse, CoughModelInfo, RiskLevel
from app.security import require_internal_token
from app.services.audio import AudioDecodeError, decode_to_mono_16k, duration_seconds
from app.services.explanations import fallback_explanation
from app.services.vertex import MedGemma

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cough"])


@router.post(
    "/cough/analyze",
    response_model=CoughAnalysisResponse,
    dependencies=[Depends(require_internal_token)],
)
async def analyze_cough(
    audio: Annotated[UploadFile, File()],
    registry: Annotated[ModelRegistry, Depends(get_registry)],
    medgemma: Annotated[MedGemma, Depends(get_medgemma)],
    explain: Annotated[bool, Form()] = True,
) -> CoughAnalysisResponse:
    settings = get_settings()
    data = await audio.read()

    if not data:
        raise ServiceError("invalid_audio", "The uploaded audio file is empty.", 422)

    if len(data) > settings.max_upload_bytes:
        raise ServiceError(
            "audio_too_large",
            f"Audio exceeds the {settings.max_upload_mb} MB limit.",
            413,
        )

    try:
        waveform = decode_to_mono_16k(data)
    except AudioDecodeError as exc:
        raise ServiceError("invalid_audio", str(exc), 422) from exc

    duration = duration_seconds(waveform)
    embedding: list[float] = []
    risk_level: RiskLevel = "unclear"
    risk_score: float | None = None
    available = True

    try:
        embedding = registry.hear().embed(waveform)
        risk_level, risk_score = registry.classifier().predict(embedding)
    except ModelNotAvailable as exc:
        available = False
        logger.warning("Cough model unavailable: %s", exc.reason)

    if available and explain:
        try:
            findings, recommendation = medgemma.explain_cough(risk_level, risk_score, duration)
        except MedGemmaUnavailable as exc:
            logger.warning("MedGemma cough explanation unavailable: %s", exc.reason)
            findings, recommendation = fallback_explanation(risk_level)
    else:
        findings, recommendation = fallback_explanation(risk_level)

    return CoughAnalysisResponse(
        risk_level=risk_level,
        risk_score=risk_score,
        findings=findings,
        recommendation=recommendation,
        embedding=embedding,
        model=CoughModelInfo(
            name=settings.tb_classifier_model,
            version=settings.hear_model,
            available=available,
        ),
        duration_s=duration,
    )
