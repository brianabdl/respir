# Clinic AI Service

FastAPI microservice for the clinic consult app. It owns local clinical audio
inference and mediates all MedGemma calls to Google Vertex AI.

## Responsibilities

| Endpoint                    | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `GET /v1/health`            | Adapter states, device, Vertex mode                       |
| `POST /v1/cough/analyze`    | HeAR embedding + TB dual-head risk + MedGemma explanation |
| `POST /v1/briefing`         | De-identified clinician briefing via Vertex MedGemma      |
| `POST /v1/embeddings/audio` | HeAR audio embedding                                      |
| `POST /v1/embeddings/text`  | EmbeddingGemma text embedding                             |
| `POST /v1/vision/analyze`   | Reserved (501 until enabled)                              |

All endpoints require the `X-Internal-Token` header. MedGemma payloads are
pseudonymized before leaving the host (`app/services/vertex.py`).

## Requirements

- Python 3.12 (managed by `uv`)
- `ffmpeg` on `PATH` for audio decoding
- Model extras for real inference, Vertex extra for the live endpoint

## Setup

```bash
cd ai-service
uv sync                      # base deps + dev tools (stubs, tests, API only)
uv sync --extra ml           # + torch/transformers/HeAR/TB/embeddings
uv sync --extra vertex       # + google-cloud-aiplatform
cp .env.example .env
```

Download local model weights (HF token must have gated access):

```bash
HF_TOKEN=... uv run scripts/download_models.py
```

## Run

```bash
uv run uvicorn app.main:app --host 127.0.0.1 --port 9000
```

Everything degrades gracefully: without `ml` extras or weights, `/cough/analyze`
returns `risk_level: "unclear"`; recordings with no audible event (near-silence
or no sustained loud burst) are also returned as `"unclear"` without invoking
the models, since the TB classifier was only trained on real coughs; without
`VERTEX_ENDPOINT_ID`, MedGemma runs in fake mode and `/health` reports
`vertex.mode: "fake"`.

## Personal cough gate (recommended)

Speech or background noise has sustained energy, so it passes the loudness
gate above — but the TB head never saw speech in training and answers with
a spurious risk. Train a tiny personal gate on your own clips:

```bash
mkdir -p data/gate/cough data/gate/other
# cough/: 5+ forced coughs. other/: 5+ speech / room-noise clips.
uv run scripts/train_cough_gate.py --cough-dir data/gate/cough --other-dir data/gate/other
```

This writes `models/cough_gate.joblib` (gitignored, personal voice prints).
`/v1/cough/analyze` then rejects non-cough samples as `"unclear"` before the
TB classifier runs. Without a trained gate the service logs a note and
skips it; `/health` reports `cough_gate.loaded: false`. Tune with
`COUGH_GATE_THRESHOLD` (probability of "cough", default 0.5).

## Vertex wiring

When the MedGemma endpoint is deployed to Model Garden, set:

```dotenv
VERTEX_PROJECT=your-project
VERTEX_LOCATION=us-central1
VERTEX_ENDPOINT_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=        # empty = use ADC
```

Then authenticate once with `gcloud auth application-default login`. No code
changes are required; `/health` switches to `vertex.mode: "endpoint"`.

## Tests

```bash
uv run pytest
uv run ruff check .
```

Tests use stub adapters and never download models, call Vertex, or read PHI.

## systemd

Template unit lives in the root migration plan (Appendix A). Point
`WorkingDirectory` at this folder, run `uv sync --extra ml --extra vertex`,
and start uvicorn on `127.0.0.1:9000`.
