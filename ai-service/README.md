# Clinic AI Service

FastAPI microservice for the clinic consult app. It owns local clinical audio
inference and mediates all MedGemma calls to Google Vertex AI.

## Responsibilities

| Endpoint                    | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `GET /v1/health`            | Adapter states, device, Vertex mode                       |
| `POST /v1/cough/analyze`    | HeAR embedding + TB dual-head risk + MedGemma explanation |
| `POST /v1/vision/anemia`    | Palm / eye / fingernail anemia screening (local models)   |
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
and `/v1/vision/anemia` return `risk_level: "unclear"`; without
`VERTEX_ENDPOINT_ID`, MedGemma runs in fake mode and `/health` reports
`vertex.mode: "fake"`.

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
