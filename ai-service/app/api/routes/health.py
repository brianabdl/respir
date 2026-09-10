from typing import Annotated

from fastapi import APIRouter, Depends

from app.config import get_settings
from app.deps import get_medgemma, get_registry
from app.ml.registry import ModelRegistry
from app.schemas.models import HealthResponse, VertexState
from app.security import require_internal_token
from app.services.vertex import MedGemma

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    dependencies=[Depends(require_internal_token)],
)
def health(
    registry: Annotated[ModelRegistry, Depends(get_registry)],
    medgemma: Annotated[MedGemma, Depends(get_medgemma)],
) -> HealthResponse:
    settings = get_settings()
    states = registry.states()

    return HealthResponse(
        status="ok" if all(state.loaded for state in states.values()) else "degraded",
        device=registry.device(),
        models=states,
        vertex=VertexState(
            configured=settings.vertex_configured,
            mode=medgemma.mode,
            model=settings.vertex_medgemma_model,
        ),
    )
