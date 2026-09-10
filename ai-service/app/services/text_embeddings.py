from app.config import Settings
from app.errors import ModelNotAvailable


class TextEmbedder:
    name = "embeddings"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise ModelNotAvailable(
                "embeddings", "install the ml extras with: uv sync --extra ml"
            ) from exc

        try:
            self._model = SentenceTransformer(
                self._settings.embedding_model,
                cache_folder=self._settings.model_cache_dir,
                token=self._settings.hf_token or None,
            )
            if self._settings.ai_device not in {"auto", ""}:
                self._model = self._model.to(self._settings.ai_device)
        except Exception as exc:
            self._model = None
            raise ModelNotAvailable("embeddings", str(exc)[:300]) from exc

    def embed(self, texts: list[str]) -> list[list[float]]:
        if self._model is None:
            self.load()

        vectors = self._model.encode(texts, normalize_embeddings=True)

        return [[float(value) for value in vector] for vector in vectors]

    def close(self) -> None:
        self._model = None
