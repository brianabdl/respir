from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ai_device: str = "auto"
    ai_service_token: str = ""
    preload_models: str = ""
    model_dir: str = ""
    hf_token: str = ""

    hear_model: str = "google/hear-pytorch"
    tb_classifier_model: str = "sach3v/Domain_aware_dual_head_HEar"
    embedding_model: str = "google/embeddinggemma-300m"
    max_upload_mb: int = 25

    vertex_project: str = ""
    vertex_location: str = "us-central1"
    vertex_endpoint_id: str = ""
    vertex_medgemma_model: str = "medgemma-4b-it"
    vertex_timeout_s: int = 60
    google_application_credentials: str = ""

    @property
    def model_cache_dir(self) -> str | None:
        return self.model_dir or None

    @property
    def vertex_configured(self) -> bool:
        return bool(self.vertex_project and self.vertex_endpoint_id)

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def preload(self) -> list[str]:
        return [name.strip() for name in self.preload_models.split(",") if name.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
