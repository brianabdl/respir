import secrets
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.config import get_settings


def require_internal_token(
    x_internal_token: Annotated[str | None, Header()] = None,
) -> None:
    token = get_settings().ai_service_token

    if not token or x_internal_token is None or not secrets.compare_digest(token, x_internal_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service token.",
        )
