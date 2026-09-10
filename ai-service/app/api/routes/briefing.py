import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.deps import get_medgemma
from app.errors import MedGemmaUnavailable
from app.schemas.models import BriefingRequest, BriefingResponse
from app.security import require_internal_token
from app.services.explanations import template_briefing
from app.services.vertex import MedGemma

logger = logging.getLogger(__name__)

router = APIRouter(tags=["briefing"])


@router.post(
    "/briefing",
    response_model=BriefingResponse,
    dependencies=[Depends(require_internal_token)],
)
def briefing(
    request: BriefingRequest,
    medgemma: Annotated[MedGemma, Depends(get_medgemma)],
) -> BriefingResponse:
    try:
        return medgemma.brief(request)
    except MedGemmaUnavailable as exc:
        logger.warning("MedGemma briefing unavailable: %s", exc.reason)

        return template_briefing(request)
