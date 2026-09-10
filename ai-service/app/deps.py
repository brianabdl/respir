from app.config import get_settings
from app.ml.registry import ModelRegistry
from app.services.vertex import MedGemma, build_medgemma

_registry: ModelRegistry | None = None
_medgemma: MedGemma | None = None


def get_registry() -> ModelRegistry:
    global _registry

    if _registry is None:
        _registry = ModelRegistry(get_settings())

    return _registry


def get_medgemma() -> MedGemma:
    global _medgemma

    if _medgemma is None:
        _medgemma = build_medgemma(get_settings())

    return _medgemma


def reset_dependencies() -> None:
    global _registry, _medgemma

    _registry = None
    _medgemma = None
