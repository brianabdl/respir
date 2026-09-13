"""Train the personal cough-vs-other gate from the operator's own clips.

Usage (from ai-service/):
    uv run scripts/train_cough_gate.py --cough-dir data/gate/cough --other-dir data/gate/other

Each directory holds .wav/.webm/.mp3 recordings. Embeddings come from the
local HeAR adapter, so this needs the ml extras and downloaded weights.
A handful of clips per class (e.g. 5 coughs, 5 speech samples) is enough
to start; accuracy printed here is optimistic (measured on training data).
Add COUGH_GATE_MODEL's directory listing to .gitignore — personal voice
prints do not belong in git.
"""

import argparse
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.ml.registry import ModelRegistry  # noqa: E402
from app.services.audio import decode_to_mono_16k  # noqa: E402

AUDIO_SUFFIXES = {".wav", ".webm", ".mp3", ".m4a", ".ogg", ".flac"}


def embed_clips(files: list[Path], label: int, registry: ModelRegistry) -> tuple[list, list]:
    vectors: list[list[float]] = []
    labels: list[int] = []

    for path in sorted(files):
        waveform = decode_to_mono_16k(path.read_bytes())
        vectors.append(registry.hear().embed(waveform))
        labels.append(label)
        print(f"  [{label}] {path.name} ({len(waveform) / 16_000:.1f}s)")

    return vectors, labels


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cough-dir", required=True, type=Path)
    parser.add_argument("--other-dir", required=True, type=Path)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    try:
        from sklearn.linear_model import LogisticRegression
    except ImportError:
        print("scikit-learn is missing. Run: uv sync --extra ml", file=sys.stderr)
        return 1

    try:
        import joblib
    except ImportError:
        print("joblib is missing. Run: uv sync --extra ml", file=sys.stderr)
        return 1

    settings = get_settings()
    out = args.out or settings.cough_gate_path

    cough_files = [p for p in args.cough_dir.iterdir() if p.suffix.lower() in AUDIO_SUFFIXES]
    other_files = [p for p in args.other_dir.iterdir() if p.suffix.lower() in AUDIO_SUFFIXES]

    if len(cough_files) < 2 or len(other_files) < 2:
        print("Need at least 2 clips per class.", file=sys.stderr)
        return 1

    registry = ModelRegistry(settings)
    registry.hear().load()

    print(f"Embedding {len(cough_files)} cough clips...")
    cough_x, cough_y = embed_clips(cough_files, 1, registry)
    print(f"Embedding {len(other_files)} other clips...")
    other_x, other_y = embed_clips(other_files, 0, registry)

    vectors = cough_x + other_x
    labels = cough_y + other_y

    model = LogisticRegression(class_weight="balanced", max_iter=1000)
    model.fit(vectors, labels)

    probs = model.predict_proba(vectors)
    correct = sum(
        (prob >= settings.cough_gate_threshold) == bool(label)
        for prob, label in zip(probs[:, 1], labels, strict=True)
    )
    print(f"Training accuracy: {correct}/{len(labels)} (optimistic, measured in-sample)")

    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "threshold": settings.cough_gate_threshold,
            "trained_at": datetime.now(UTC).isoformat(),
            "n_cough": len(cough_files),
            "n_other": len(other_files),
        },
        out,
    )
    print(f"Saved gate to {out}")
    print("Restart the service (or add 'gate' to PRELOAD_MODELS) to activate it.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
