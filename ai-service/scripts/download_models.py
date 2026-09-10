"""Download the local clinical models from Hugging Face.

HeAR and the TB dual-head classifier are gated repositories: the HF account
attached to HF_TOKEN must have accepted their terms before running this.
"""

import os
import sys


def main() -> int:
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("huggingface_hub is missing. Run: uv sync --extra ml", file=sys.stderr)
        return 1

    token = os.environ.get("HF_TOKEN")

    if not token:
        print("HF_TOKEN is not set; gated repositories will fail to download.", file=sys.stderr)
        return 1

    models = [
        os.environ.get("HEAR_MODEL", "google/hear"),
        os.environ.get("TB_CLASSIFIER_MODEL", "sach3v/Domain_aware_dual_head_HEar"),
        os.environ.get("EMBEDDING_MODEL", "google/embeddinggemma-300m"),
    ]
    cache_dir = os.environ.get("MODEL_DIR") or None

    for model in models:
        print(f"Downloading {model}...")
        path = snapshot_download(repo_id=model, token=token, cache_dir=cache_dir)
        print(f"  -> {path}")

    print("All models downloaded.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
