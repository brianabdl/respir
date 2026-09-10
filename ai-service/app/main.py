import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes import briefing, cough, embeddings, health, vision
from app.config import get_settings
from app.deps import get_registry
from app.errors import ServiceError

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    registry = get_registry()

    for name in get_settings().preload:
        try:
            registry.load(name)
            logger.info("Preloaded model adapter: %s", name)
        except Exception:
            logger.exception("Failed to preload model adapter: %s", name)

    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Clinic AI Service",
        version="0.1.0",
        lifespan=lifespan,
    )

    for router in (health.router, cough.router, briefing.router, embeddings.router, vision.router):
        app.include_router(router, prefix="/v1")

    @app.exception_handler(ServiceError)
    async def handle_service_error(request: Request, exc: ServiceError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_payload())

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "invalid_request",
                    "message": "The request payload failed validation.",
                    "retryable": False,
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": "unauthorized" if exc.status_code == 401 else "http_error",
                    "message": str(exc.detail),
                    "retryable": False,
                }
            },
        )

    return app


app = create_app()
