# Respair

**Agentic pre-visit AI for primary care — TB screening & structured clinician briefings.**

Respair is a clinic-facing platform that runs patients through a private pre-visit:
a guided voice interview with an AI assistant, a cough-based tuberculosis screen,
and a structured briefing prepared for the clinician before consultation.

The realtime conversation is powered by the Gemini Live API. All clinical
intelligence — cough acoustics, TB risk classification, explanations, and the
clinician briefing — runs on a local Python microservice and Google Vertex AI
(MedGemma). Direct patient identifiers are removed before anything reaches an
external model.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Technical Documentation](#technical-documentation)
- [Configuration](#configuration)
- [Testing](#testing)
- [Security & Privacy](#security--privacy)
- [Deploying to Vertex AI](#deploying-to-vertex-ai)
- [License](#license)

---

## Overview

Respair helps primary-care clinics move the patient interview ahead of the visit.

A patient consents, sits in front of the camera, and speaks with **Sage** — the
voice agent — who asks pre-visit questions one at a time, then captures a cough
sample. Cough acoustics are analyzed locally against a tuberculosis risk model,
and a de-identified briefing (chief complaint, history, risk factors, suggested
questions, red flags) is generated for the clinician.

### The patient journey

1. **Intake & interview** — Sage greets the patient, collects symptoms and risk
   history through a natural, barge-in-enabled voice conversation.
2. **Cough screen** — the patient coughs toward the microphone; the recording is
   analyzed asynchronously into a `low` / `medium` / `high` / `unclear` risk level.
3. **Briefing** — the clinician opens an organized, decision-ready summary before
   the consultation, with a similarity lookup against comparable past coughs.

## Features

- **Realtime voice interview** — Sage runs conversational turn-taking with live
  transcripts, barge-in, and optional camera presence.
- **Cough-based TB screening** — HeAR embeddings plus a TB dual-head classifier,
  with clinician-readable findings.
- **Structured clinician briefing** — generated from de-identified transcript and
  cough data via MedGemma on Vertex AI.
- **Doctor review console** — live transcript, cough analysis, briefing, capture
  downloads, and acoustic similarity search.
- **Consent-first design** — a server-enforced consent gate guards microphone,
  camera, and cough capture before anything starts.
- **Full auditability** — every patient-data access and external AI call lands in
  an append-only audit log that never contains clinical content.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel 13 · PHP 8.5 · `laravel/ai` agent SDK · Pest · Larastan · Pint |
| Frontend | Inertia v3 · React 19 · TypeScript · Tailwind CSS 4 · Vite 8 · Wayfinder |
| Realtime | Gemini Live API (interaction) · Laravel Reverb + `@laravel/echo-react` |
| AI service | Python 3.12 · FastAPI · HeAR · TB dual-head classifier · EmbeddingGemma |
| Clinical LLM | MedGemma on Google Vertex AI (Model Garden) |
| Data | PostgreSQL 18 + pgvector · Valkey (queues & cache, Redis-compatible) |
| Audio | HeAR (local cough embeddings) · ffmpeg (decoding) |

## Repository Structure

```
app/
├── Ai/Agents/          ConsultAgent — Sage's conversation & turn logic
├── Domain/
│   ├── Audit/          AuditLogger, AuditAction
│   └── Consult/        Actions · DTOs · Enums · Events · Jobs · Services
├── Http/Controllers/   Consult (patient flow), Doctor (review console)
└── Models/             Consultation, ConsultCapture, ConsultSessionLog, ...
ai-service/             Python FastAPI microservice (clinical inference)
resources/js/           Inertia React SPA — consult, doctor, landing, components
tests/                  Feature tests, security tests, audio fixtures
```

## Installation

### Prerequisites

| Tool | Version / Notes |
| --- | --- |
| PHP | 8.5, with `pdo_pgsql`, `redis`, `pcntl` |
| Composer | 2.x |
| Bun | 1.4+ |
| PostgreSQL | 18, with the `pgvector` extension |
| Valkey | (or Redis) |
| Python | 3.12, managed by [uv](https://docs.astral.sh/uv/) |
| ffmpeg | on `PATH` |
| Google | Gemini API key (realtime interaction); optional HF token for gated HeAR models |

### Setup

```bash
git clone <repository-url> respair
cd respair

composer setup    # composer install · .env · key · migrate · bun install · build
```

Create the `vector` extension once as a PostgreSQL superuser (main and test
databases):

```bash
sudo -u postgres psql -d agen_gemma  -c 'CREATE EXTENSION IF NOT EXISTS vector;'
sudo -u postgres psql -d ':memory:'   -c 'CREATE EXTENSION IF NOT EXISTS vector;'  # tests
```

Set up the Python AI service:

```bash
cd ai-service
cp .env.example .env                 # match AI_SERVICE_TOKEN to the root .env
uv sync --extra ml --extra vertex    # torch/transformers/HeAR/TB/Vertex SDK
HF_TOKEN=... uv run scripts/download_models.py   # gated HeAR / TB / embedding weights
```

## Usage

Run the application in two terminals:

```bash
# Terminal 1 — Laravel server, Vite, Reverb, pail, AI + default queue listeners
composer run dev

# Terminal 2 — Python AI service
cd ai-service && uv run uvicorn app.main:app --host 127.0.0.1 --port 9000
```

Health checks:

```bash
curl -s -H "X-Internal-Token: $AI_SERVICE_TOKEN" http://127.0.0.1:9000/v1/health
valkey-cli ping
```

The AI service degrades gracefully — without local weights cough analysis returns
`unclear`, and without a Vertex endpoint MedGemma runs in fake mode
(`/v1/health` reports `vertex.mode: "fake"`).

## Technical Documentation

### Architecture

```
Browser (Inertia React SPA)  — consult.tsx · doctor/*.tsx
  · Gemini Live (Sage voice, camera presence, barge-in)
  · MediaRecorder cough capture · useEcho (Reverb) live updates
              │ Inertia / JSON / SSE + Gemini Live WS     │ Reverb WS
              ▼                                           ▲
Laravel 13    — app/Domain/Consult (Actions · DTOs · Events · Jobs · Services)
  · Valkey queues/cache · Reverb broadcast · storage
  · PythonAiClient ──────────────────────────────┐
                                               │ HTTP (X-Internal-Token)
                                               ▼
Python FastAPI (ai-service)
  · /v1/cough/analyze   HeAR + TB dual-head + MedGemma explanation
  · /v1/briefing        de-identified clinician briefing
  · /v1/embeddings/audio · /v1/embeddings/text · /v1/vision (reserved)
              │                        │ HTTPS (ADC)
              ▼                        ▼
     PostgreSQL + pgvector     Vertex AI Model Garden (MedGemma)
```

### The consultation flow

1. The patient consents — Laravel records `consultations.consented_at`.
2. Sage runs the realtime interview in the browser via Gemini Live.
3. The cough recording is stored as a capture and queued on the `ai` queue.
4. The Python service computes a HeAR embedding, scores TB risk, and asks
   MedGemma for a plain-language explanation.
5. Laravel persists the analysis and embedding (pgvector), then broadcasts
   `cough.analysis` over Reverb — the UI updates without a refresh.
6. The clinician regenerates/views the briefing from the review console.

### AI pipeline detail

- **Cough screening** — audio is decoded to 16 kHz mono, embedded with HeAR,
  scored by the TB dual-head classifier, then explained by MedGemma. The
  512-dimension embedding is stored in `cough_embeddings` (pgvector, HNSW cosine
  index) for acoustic similarity.
- **Clinician briefing** — `BriefingPayloadBuilder` pseudonymizes the patient
  (name → subject token, emails stripped) and sends only de-identified content;
  the Python service rejects payloads containing identifying fields.
- **Failure behavior** — analysis failures persist an `unclear` result rather than
  blocking the consultation; Vertex failures fall back to a template briefing
  marked `degraded: true`. Jobs retry with backoff and always broadcast a final
  state.

## Configuration

Key Laravel environment variables (full list in `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DB_*` | PostgreSQL connection (`agen_gemma`) |
| `QUEUE_CONNECTION=redis` | Valkey-backed queue |
| `CACHE_STORE=redis` | Valkey-backed cache |
| `BROADCAST_CONNECTION=reverb` | Reverb WebSocket broadcasting |
| `REVERB_*` / `VITE_REVERB_*` | Reverb server/client credentials |
| `AI_SERVICE_URL` / `AI_SERVICE_TOKEN` | Python service endpoint + shared secret |
| `GEMINI_API_KEY` / `GEMINI_URL` | Realtime interaction layer only |

Key Python service variables (full list in `ai-service/.env.example`):

| Variable | Purpose |
| --- | --- |
| `AI_DEVICE` | `auto`, `cpu`, or `cuda` |
| `HF_TOKEN` / `HEAR_MODEL` / `TB_CLASSIFIER_MODEL` / `EMBEDDING_MODEL` | Model sources |
| `VERTEX_PROJECT` / `VERTEX_LOCATION` / `VERTEX_ENDPOINT_ID` | Vertex MedGemma endpoint |
| `PRELOAD_MODELS` | Adapters to load at startup |

## Testing

```bash
# Laravel (PostgreSQL; Pest is the framework)
DB_CONNECTION=pgsql php artisan test --compact
composer test                                  # Pint + PHPStan + Pest

# Python
cd ai-service
uv run pytest
uv run ruff check .

# Live contract test (service must be running)
AI_SERVICE_INTEGRATION=1 DB_CONNECTION=pgsql php artisan test --compact tests/Feature/Consult/AiServiceIntegrationTest.php
```

CI runs both suites via `.github/workflows/tests.yml` and
`.github/workflows/ai-service.yml`.

## Security & Privacy

- **Consent first** — microphone, camera, cough capture, and live sessions require
  `consultations.consented_at`; enforcement is server-side, not UI-only.
- **Data minimization** — direct identifiers never reach Gemini or Vertex AI; the
  briefing builder scrubs names/emails and the Python service rejects identifying
  fields.
- **Audit logging** — doctor access, downloads, briefing generation, consent, and
  external AI calls are logged (actor, subject, destination, IP) with no clinical
  content.
- **Signed downloads** — captures are served via temporary signed URLs (30 min),
  authorized to the patient or a doctor.
- **Rate limiting** — voice (20/min), chat (30/min), cough (10/min) per user.
- **Local first** — cough audio and embeddings stay on clinic hardware; only
  de-identified text leaves the host.

## Deploying to Vertex AI

No code changes required once the MedGemma Model Garden endpoint exists — set
`ai-service/.env` and restart:

```dotenv
VERTEX_PROJECT=your-project
VERTEX_LOCATION=us-central1
VERTEX_ENDPOINT_ID=123456789
```

Authenticate with `gcloud auth application-default login`; confirm
`/v1/health` reports `vertex.mode: "endpoint"`.

## License

Released under the [MIT License](LICENSE).