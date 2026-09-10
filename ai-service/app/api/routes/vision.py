from fastapi import APIRouter, Depends

from app.errors import ServiceError
from app.security import require_internal_token

router = APIRouter(tags=["vision"])


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
