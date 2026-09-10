"""Download the local clinical models from Hugging Face.

HeAR and the TB dual-head classifier are gated repositories: the HF account
attached to HF_TOKEN must have accepted their terms before running this. The
anemia probes and the EmbeddingGemma encoder are public.
"""

import os
import sys

GATED_MODELS = [
    ("HEAR_MODEL", "google/hear"),
    ("TB_CLASSIFIER_MODEL", "sach3v/Domain_aware_dual_head_HEar"),
]

PUBLIC_MODELS: list[tuple[str, str, list[str] | None]] = [
    ("EMBEDDING_MODEL", "google/embeddinggemma-300m", None),
    (
        "ANEMIA_PALM_MODEL",
        "Sidharth1743/palm-medsiglip-linear-probe",
        [
            "artifacts/config.json",
            "artifacts/linear_head.pt",
            "artifacts/scaler.joblib",
            "artifacts/vision_model/*",
        ],
    ),
    (
        "ANEMIA_EYE_MODEL",
        "Sidharth1743/eye-medsiglip-linear-probe",
        [
            "artifacts/config.json",
            "artifacts/linear_head.pt",
            "artifacts/scaler.joblib",
            "artifacts/vision_model/*",
        ],
    ),
    ("ANEMIA_NAIL_MODEL", "JetX-GT/nail-anemia-detector", None),
]


def main() -> int:
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("huggingface_hub is missing. Run: uv sync --extra ml", file=sys.stderr)
        return 1

    token = os.environ.get("HF_TOKEN")
    cache_dir = os.environ.get("MODEL_DIR") or None

    for env_key, default, allow_patterns in PUBLIC_MODELS:
        model = os.environ.get(env_key, default)
        print(f"Downloading {model}...")
        path = snapshot_download(
            repo_id=model,
            token=token,
            cache_dir=cache_dir,
            allow_patterns=allow_patterns,
        )
        print(f"  -> {path}")

    if not token:
        print(
            "HF_TOKEN is not set; skipping gated HeAR/TB repositories.",
            file=sys.stderr,
        )
        return 1

    for env_key, default in GATED_MODELS:
        model = os.environ.get(env_key, default)
        print(f"Downloading {model}...")
        path = snapshot_download(repo_id=model, token=token, cache_dir=cache_dir)
        print(f"  -> {path}")

    print("All models downloaded.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
