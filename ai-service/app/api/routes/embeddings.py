from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.config import get_settings
from app.deps import get_registry
from app.errors import ModelNotAvailable, ServiceError
from app.ml.registry import ModelRegistry
from app.schemas.models import (
    AudioEmbeddingResponse,
    TextEmbeddingRequest,
    TextEmbeddingResponse,
)
from app.security import require_internal_token
from app.services.audio import AudioDecodeError, decode_to_mono_16k

router = APIRouter(tags=["embeddings"])


@router.post(
    "/embeddings/audio",
    response_model=AudioEmbeddingResponse,
    dependencies=[Depends(require_internal_token)],
)
async def audio_embedding(
    audio: Annotated[UploadFile, File()],
    registry: Annotated[ModelRegistry, Depends(get_registry)],
) -> AudioEmbeddingResponse:
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

    try:
        embedding = registry.hear().embed(waveform)
    except ModelNotAvailable as exc:
        raise ServiceError("model_unavailable", exc.reason, 503, retryable=True) from exc

    return AudioEmbeddingResponse(
        embedding=embedding,
        dim=len(embedding),
        model=settings.hear_model,
    )


@router.post(
    "/embeddings/text",
    response_model=TextEmbeddingResponse,
    dependencies=[Depends(require_internal_token)],
)
def text_embedding(
    request: TextEmbeddingRequest,
    registry: Annotated[ModelRegistry, Depends(get_registry)],
) -> TextEmbeddingResponse:
    settings = get_settings()

    texts = [text for text in request.texts if text.strip()]

    if not texts:
        raise ServiceError("invalid_request", "At least one non-empty text is required.", 422)

    if len(texts) > 64:
        raise ServiceError("invalid_request", "At most 64 texts can be embedded per request.", 422)

    try:
        embeddings = registry.text_embeddings().embed(texts)
    except ModelNotAvailable as exc:
        raise ServiceError("model_unavailable", exc.reason, 503, retryable=True) from exc

    return TextEmbeddingResponse(
        embeddings=embeddings,
        dim=len(embeddings[0]) if embeddings else 0,
        model=settings.embedding_model,
    )
