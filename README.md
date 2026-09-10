# Clinic AI Agent — TB Detection & Pre-Visit Assistance

An interactive, agentic clinical assistant for primary-care clinics. The system guides
patients through a structured pre-visit interview, screens a recorded cough for
Tuberculosis (TB) risk, and prepares a clinician briefing before the consultation.

Realtime conversation runs on Gemini Live. All clinical intelligence — cough
acoustics, risk classification, explanations, and the doctor briefing — runs on a
local Python microservice and Google Vertex AI (MedGemma), with patient identifiers
removed before any external model call.

- Product overview: [`OVERVIEW.md`](OVERVIEW.md)
- Architecture and migration decisions: [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md)
- Python service details: [`ai-service/README.md`](ai-service/README.md)

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Running locally](#running-locally)
- [Configuration](#configuration)
- [AI pipeline](#ai-pipeline)
- [Testing](#testing)
- [Security and privacy](#security-and-privacy)
- [Deploying to Vertex AI](#deploying-to-vertex-ai)
- [Documentation](#documentation)

---

## Features

- **Realtime pre-visit interview** — a friendly triage assistant ("Sage") conducts a
  voice conversation, asks follow-up questions one at a time, and supports
  barge-in, live transcripts, and optional camera presence.
- **Cough-based TB screening** — a recorded cough is analysed locally with Google
  HeAR embeddings and a TB dual-head classifier, producing a `low` / `medium` /
  `high` / `unclear` risk level with clinician-readable findings.
- **Clinician briefing** — de-identified transcripts and cough findings are turned
  into a structured pre-consultation summary (chief complaint, history, risk
  factors, suggested questions, red flags) via MedGemma on Vertex AI.
- **Doctor review console** — live-updating list and detail views with full session
  transcripts, cough analysis, generated briefings, capture downloads, and a
  similarity lookup for acoustically comparable coughs.
- **Consent-first design** — a blocking consent gate is enforced server-side before
  microphone, camera, or cough capture; AI processing is disclosed before it starts.
- **Auditability** — every patient-data access and external AI call is recorded in
  an append-only audit log that never stores clinical content.

## Architecture

```
┌──────────────────────────── Browser (Inertia React SPA) ────────────────────────────┐
│  consult.tsx   doctor/*.tsx                                                          │
│  • Gemini Live WS (voice duplex, camera presence, barge-in)                          │
│  • MediaRecorder cough capture     • useEcho (Reverb) live updates                    │
│  • Consent gate before mic/camera  • Inertia pages / Wayfinder routes                 │
└───────────────┬─────────────────────────────────────────────────┬────────────────────┘
                │ Inertia / JSON / SSE + Gemini Live WS           │ WebSocket (Reverb)
                ▼                                                  ▲
┌────────────────────────────── Laravel 13 ────────────────────────┴────────────────────┐
│  app/Domain/Consult   Actions · DTOs · Events · Jobs · Services                       │
│  Queues (Valkey) · Cache (Valkey) · Broadcast (Reverb) · Storage (local)               │
│  PythonAiClient ───────────────────────────────────────────┐                           │
└────────────────────────────────────────────────────────────┼───────────────────────────┘
                                                             │ HTTP (internal token)
                                                             ▼
┌──────────────────────── Python FastAPI (ai-service) ───────────────────────────────────┐
│  /v1/cough/analyze      HeAR embeddings + TB dual-head + MedGemma explanation          │
│  /v1/briefing           structured clinician briefing (de-identified)                  │
│  /v1/embeddings/audio   HeAR                /v1/embeddings/text  EmbeddingGemma       │
│  /v1/vision/analyze     reserved for future imaging                                    │
└───────────────┬───────────────────────────────────────────┬───────────────────────────┘
                │                                           │ HTTPS (ADC)
                ▼                                           ▼
        PostgreSQL 18 + pgvector                  Google Vertex AI (Model Garden)
        consultations · captures · audit          MedGemma endpoint
```

Flow of a consultation:

1. The patient consents; Laravel records `consented_at`.
2. Gemini Live runs the realtime interview in the browser.
3. A cough recording is stored as a capture and queued on the `ai` queue.
4. The Python service computes a HeAR embedding, classifies TB risk, and asks
   MedGemma for a plain-language explanation.
5. Laravel stores the analysis, persists the embedding in pgvector, and broadcasts
   `cough.analysis`; the UI updates without a refresh.
6. A doctor regenerates the briefing from the review console when needed.

## Technology stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 13, PHP 8.5, Pest 5, Larastan, Pint |
| Frontend | Inertia v3, React 19, TypeScript 5.7, Tailwind CSS 4, Vite 8, Wayfinder |
| Realtime | Gemini Live API (interaction), Laravel Reverb + `@laravel/echo-react` (updates) |
| AI service | Python 3.12, uv, FastAPI, HeAR, TB dual-head classifier, EmbeddingGemma |
| Clinical LLM | MedGemma on Google Vertex AI (Model Garden endpoint) |
| Data | PostgreSQL 18 + pgvector, Valkey (Redis-compatible) for queues/cache |
| Audio | HeAR locally for cough embeddings; ffmpeg for decoding |

## Repository layout

```
app/
├── Ai/Agents/              ConsultAgent (Gemini fallback chat)
├── Domain/
│   ├── Audit/              AuditLogger, AuditAction
│   └── Consult/            Actions, DTOs, Enums, Events, Jobs, Services
├── Http/Controllers/       Consult (patient flow), Doctor (review console)
└── Models/                 Consultation, ConsultCapture, ConsultSessionLog, ...
ai-service/                 Python FastAPI microservice (see its own README)
resources/js/
├── lib/                    gemini-live, live-audio, echo
├── pages/                  consult, doctor/index, doctor/show
└── components/             consent-gate and UI primitives
tests/
├── Feature/Consult/        consultation flow, jobs, client, integration
├── Feature/Doctor/         review console, briefing, similarity
├── Feature/Security/       audit, signed downloads, rate limits
└── Fixtures/               audio fixtures
```

## Getting started

### Prerequisites

- PHP 8.5 with `pdo_pgsql`, `redis`, `pcntl`
- Composer 2
- Bun 1.4+
- PostgreSQL 18 with the `pgvector` package
- Valkey (or Redis)
- Python 3.12 managed by [uv](https://docs.astral.sh/uv/)
- `ffmpeg` on `PATH`
- A Google Gemini API key (realtime interaction)
- Optional: a Hugging Face token with access to the gated HeAR repository

### Installation

```bash
git clone <repository-url> agentic-medgemma
cd agentic-medgemma

composer setup          # composer install, .env, key, migrate, bun install, build
```

Then configure `.env` (see [Configuration](#configuration)) and prepare the database
extensions once as a PostgreSQL superuser:

```bash
sudo -u postgres psql -d agen_gemma -c 'CREATE EXTENSION IF NOT EXISTS vector;'
sudo -u postgres psql -d ':memory:' -c 'CREATE EXTENSION IF NOT EXISTS vector;'  # test database
```

Set up the Python service:

```bash
cd ai-service
cp .env.example .env                    # set AI_SERVICE_TOKEN to match the root .env
uv sync                                 # base API + tests
uv sync --extra ml --extra vertex       # real inference and Vertex SDK
HF_TOKEN=... uv run scripts/download_models.py   # gated HeAR / TB / embedding weights
```

## Running locally

Two terminals are enough — `composer run dev` starts the HTTP server, Vite, log
tail, Laravel Reverb, and a queue listener that processes both the `ai` and
`default` queues.

```bash
# Terminal 1 — application, Vite, Reverb, queue worker, logs
composer run dev

# Terminal 2 — Python AI service
cd ai-service && uv run uvicorn app.main:app --host 127.0.0.1 --port 9000
```

Health checks:

```bash
curl -s -H "X-Internal-Token: $AI_SERVICE_TOKEN" http://127.0.0.1:9000/v1/health
valkey-cli ping
```

The AI service degrades gracefully: without local weights, cough analysis returns
`risk_level: "unclear"`; without a Vertex endpoint, MedGemma runs in fake mode and
`/v1/health` reports `vertex.mode: "fake"`.

## Configuration

Key Laravel environment variables (full list in `.env.example`):

| Variable | Purpose |
|----------|---------|
| `DB_*` | PostgreSQL connection (`agen_gemma`) |
| `QUEUE_CONNECTION=redis` | Valkey-backed queue (Redis-compatible) |
| `CACHE_STORE=redis` | Valkey-backed cache |
| `BROADCAST_CONNECTION=reverb` | Reverb WebSocket broadcasting |
| `REVERB_*`, `VITE_REVERB_*` | Reverb server/client credentials |
| `AI_SERVICE_URL`, `AI_SERVICE_TOKEN` | Python service endpoint and shared secret |
| `AI_SERVICE_TIMEOUT`, `AI_SERVICE_RETRIES` | Client timeout and retry count |
| `GEMINI_API_KEY`, `GEMINI_URL` | Realtime interaction layer only |

Key Python service variables (full list in `ai-service/.env.example`):

| Variable | Purpose |
|----------|---------|
| `AI_DEVICE` | `auto`, `cpu`, or `cuda` |
| `HF_TOKEN`, `HEAR_MODEL`, `TB_CLASSIFIER_MODEL`, `EMBEDDING_MODEL` | Model sources |
| `VERTEX_PROJECT`, `VERTEX_LOCATION`, `VERTEX_ENDPOINT_ID` | Vertex MedGemma endpoint |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional; empty means Application Default Credentials |
| `PRELOAD_MODELS` | Adapters to load at startup (empty on CPU development) |

## AI pipeline

**Cough screening** — the patient's recording is decoded to 16 kHz mono, embedded
with HeAR, scored by the TB dual-head classifier, and explained by MedGemma. The
512-dimension embedding is stored in `cough_embeddings` (pgvector, HNSW cosine
index) and can be compared against other consultations from the doctor console.

**Clinician briefing** — `BriefingPayloadBuilder` replaces the patient's name with
a subject token, strips email addresses, and sends only de-identified content.
The Python service validates the payload shape (no identifying fields are accepted),
redacts remaining patterns, and never receives direct identifiers.

**Failure behaviour** — analysis failures persist an `unclear` result instead of
blocking the consultation; Vertex failures fall back to a template briefing marked
`degraded: true`. Jobs retry with backoff and always broadcast a final state.

## Testing

Laravel:

```bash
DB_CONNECTION=pgsql php artisan test --compact
composer test        # Pint + PHPStan + Pest
```

> Pest runs against a real PostgreSQL database named `:memory:` (see `phpunit.xml`).
> That database needs the `vector` extension created once as a superuser — see above.

Python:

```bash
cd ai-service
uv run pytest
uv run ruff check .
```

Live contract test against a running service:

```bash
AI_SERVICE_INTEGRATION=1 DB_CONNECTION=pgsql php artisan test --compact tests/Feature/Consult/AiServiceIntegrationTest.php
```

Continuous integration runs both suites through `.github/workflows/tests.yml`
and `.github/workflows/ai-service.yml`.

## Security and privacy

- **Consent first** — microphone, camera, cough capture, and live sessions require
  `consultations.consented_at`; the check runs server-side, not only in the UI.
- **Data minimisation** — direct identifiers never reach Gemini or Vertex AI; the
  briefing builder scrubs names and emails, and the Python service rejects payloads
  with identifying fields.
- **Audit logging** — doctor access, capture downloads, briefing generation,
  consent, and external AI calls are recorded with actor, subject, destination,
  and IP. Clinical content is never written to the audit log.
- **Signed downloads** — captures are served through temporary signed URLs
  (30 minutes) and are additionally authorized to the patient or a doctor.
- **Rate limiting** — voice (20/min), chat (30/min), and cough (10/min) endpoints
  are throttled per user.
- **Local first** — cough audio and embeddings stay on clinic hardware; only
  de-identified text is sent to external services.
- **Secrets** — `AI_SERVICE_TOKEN` lives only in the two `.env` files; never commit
  credentials or Vertex service-account keys.

## Deploying to Vertex AI

MedGemma is deployed by the operator as a Vertex AI Model Garden endpoint. Once the
endpoint exists, no code changes are required — set the environment variables in
`ai-service/.env` and restart the service:

```dotenv
VERTEX_PROJECT=your-project
VERTEX_LOCATION=us-central1
VERTEX_ENDPOINT_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=        # empty = ADC
```

Authenticate with `gcloud auth application-default login` and confirm
`/v1/health` reports `vertex.mode: "endpoint"`.

## Documentation

| Document | Contents |
|----------|----------|
| [`OVERVIEW.md`](OVERVIEW.md) | Product summary, models, and future enhancements |
| [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) | Architecture decisions, phases, runbook |
| [`ai-service/README.md`](ai-service/README.md) | Python service setup and endpoints |

## License

Released under the MIT License.
