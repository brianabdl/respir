import io
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from PIL import Image

from app.config import get_settings
from app.deps import get_registry
from app.errors import ModelNotAvailable, ServiceError
from app.ml.registry import ModelRegistry
from app.schemas.models import (
    AnemiaAnalysisResponse,
    AnemiaModelInfo,
    AnemiaPart,
    RiskLevel,
)
from app.security import require_internal_token
from app.services.explanations import fallback_anemia_explanation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["vision"])


@router.post(
    "/vision/anemia",
    response_model=AnemiaAnalysisResponse,
    dependencies=[Depends(require_internal_token)],
)
async def analyze_anemia(
    image: Annotated[UploadFile, File()],
    part: Annotated[AnemiaPart, Form()],
    registry: Annotated[ModelRegistry, Depends(get_registry)],
) -> AnemiaAnalysisResponse:
    settings = get_settings()
    data = await image.read()

    if not data:
        raise ServiceError("invalid_image", "The uploaded image is empty.", 422)

    if len(data) > settings.max_upload_bytes:
        raise ServiceError(
            "image_too_large",
            f"Image exceeds the {settings.max_upload_mb} MB limit.",
            413,
        )

    try:
        decoded = Image.open(io.BytesIO(data))
        decoded.load()
        decoded = decoded.convert("RGB")
    except Exception as exc:
        raise ServiceError(
            "invalid_image", "The uploaded file is not a readable image.", 422
        ) from exc

    classifier = registry.anemia()
    available = True
    risk_level: RiskLevel = "unclear"
    risk_score: float | None = None
    prediction = "Unknown"
    threshold: float | None = None

    try:
        result = classifier.predict(part, decoded)
        risk_level = result.risk_level
        risk_score = result.probability
        prediction = result.label
        threshold = result.threshold
    except ModelNotAvailable as exc:
        available = False
        logger.warning("Anemia model unavailable for %s: %s", part, exc.reason)

    if available:
        findings, recommendation = fallback_anemia_explanation(part, risk_level == "high")
    else:
        findings, recommendation = fallback_anemia_explanation(part, None)

    return AnemiaAnalysisResponse(
        part=part,
        risk_level=risk_level,
        risk_score=risk_score,
        prediction=prediction,
        threshold=threshold,
        findings=findings,
        recommendation=recommendation,
        model=AnemiaModelInfo(
            name=classifier.model_name(part),
            version=classifier.model_version(part),
            available=available,
        ),
    )


@router.post(
    "/vision/analyze",
    dependencies=[Depends(require_internal_token)],
)
def analyze_image() -> None:
    raise ServiceError(
        "not_implemented",
        "Vision analysis is not enabled yet.",
        501,
    )
