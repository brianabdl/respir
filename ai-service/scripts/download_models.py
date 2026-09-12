"""Download the local clinical models from Hugging Face.

Settings (including HF_TOKEN) are read from ai-service/.env, so the same
credentials used by the service apply here. HeAR (PyTorch), the TB dual-head
classifier and EmbeddingGemma are gated and require the HF account to have
accepted their terms.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402

GATED_MODELS: list[tuple[str, str]] = [
    ("HEAR_MODEL", "hear_model"),
    ("TB_CLASSIFIER_MODEL", "tb_classifier_model"),
    ("EMBEDDING_MODEL", "embedding_model"),
]


def main() -> int:
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("huggingface_hub is missing. Run: uv sync --extra ml", file=sys.stderr)
        return 1

    settings = get_settings()
    token = settings.hf_token or None
    cache_dir = settings.model_cache_dir
    failures: list[str] = []

    def download(model: str) -> None:
        try:
            path = snapshot_download(
                repo_id=model,
                token=token,
                cache_dir=cache_dir,
            )
            print(f"  -> {path}")
        except Exception as exc:
            print(f"  !! failed: {str(exc)[:200]}", file=sys.stderr)
            failures.append(model)

    if not token:
        print(
            "HF_TOKEN is not set in ai-service/.env; gated repositories cannot be downloaded.",
            file=sys.stderr,
        )
        return 1

    for env_key, attr in GATED_MODELS:
        model = getattr(settings, attr)
        print(f"Downloading {model} ({env_key})...")
        download(model)

    if failures:
        print(f"Models not downloaded: {', '.join(failures)}", file=sys.stderr)
        return 1

    print("All requested models downloaded.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
