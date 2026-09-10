# Migration Plan — Hybrid Clinical AI Architecture

**Status:** Draft v3 for supervisor approval (supersedes v1 full-local, v2 local-MedGemma plans)
**Date:** 2026-09-10
**Companion document:** `OVERVIEW.md` (target architecture summary)

> **Revision notes**
>
> - v1 assumed full-local dialogue with Gemini removed.
> - v2 adopted hybrid interaction (Gemini Live for realtime) with MedGemma local via Ollama.
> - **v3 (this document):** MedGemma is hosted by the supervisor on **Google Vertex AI** (Model Garden endpoint) instead of local Ollama. All MedGemma calls move into the Python service. Privacy posture and consent text updated accordingly.

---

## 1. Purpose

Migrate the current working MVP (Gemini-based realtime interaction) to the target architecture from `OVERVIEW.md`, keeping the realtime interactive experience while moving clinical reasoning and audio ML to dedicated services:

- Laravel remains the orchestrator (auth, state, queues, broadcasting, persistence).
- Gemini Live remains the realtime interaction transport (duplex voice, camera presence, barge-in, transcripts).
- Python FastAPI microservice owns clinical inference: HeAR embeddings, TB classifier, text embeddings, **and MedGemma calls to Vertex AI** (cough explanation, clinician briefing, future vision).
- MedGemma inference is hosted on **Google Vertex AI** (Model Garden dedicated endpoint) — no local Ollama.
- PostgreSQL + pgvector stores relational data and embeddings.
- Valkey (Redis-compatible) powers queues/cache; Laravel Reverb broadcasts updates to the Inertia React frontend.

The migration is executed in phases. No phase starts before the previous is reviewed and approved.

---

## 2. Decisions Locked By Supervisor (Revision 3)

| ID  | Decision                          | Choice                                                                                                                                                                       |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Migration delivery                | Plan doc first, then phased implementation with review between phases                                                                                                        |
| D2  | Realtime interaction              | **Hybrid**: Gemini Live API for duplex voice + camera presence; no external persistence                                                                                      |
| D3  | Infra (pgvector, Valkey, FastAPI) | Native system services (no Docker). No local LLM runtime required                                                                                                            |
| D4  | Frontend                          | Stay on Inertia v3 + React + Wayfinder                                                                                                                                       |
| D5  | Laravel code structure            | Domain-oriented refactor (`app/Domain/...`)                                                                                                                                  |
| D6  | Local audio models                | HF token available (HeAR gated access approved); build GPU-ready, develop on CPU                                                                                             |
| D7  | Clinical reasoning host           | **MedGemma on Google Vertex AI** (Model Garden endpoint), called from Python service                                                                                         |
| D8  | MedGemma variant                  | Configurable via env; default 4B-it multimodal (Model Garden v1.5.0); 27B optional                                                                                           |
| D9  | Gemini scope                      | Kept for interaction only (Live voice/camera + turn-based fallback). **Never for cough analysis, clinical reasoning, or briefing.**                                          |
| D10 | System installs                   | Supervisor authorized `sudo` commands (pgvector + services)                                                                                                                  |
| D11 | Camera semantics                  | Presence + clinician-visible captures only; agent reacts to speech, not video frames                                                                                         |
| D12 | Privacy                           | Explicit consent screen before voice/camera; live media not persisted externally; clinical prompts to Vertex are pseudonymized                                               |
| D13 | Vertex deployment                 | Supervisor manages Model Garden endpoint deployment, GCP project, region, quotas, and credentials                                                                            |
| D14 | Vertex timing & auth              | Endpoint not deployed yet — build against a fake Vertex transport with frozen contract; wire the real endpoint later. Auth via ADC (`gcloud auth application-default login`) |

---

## 3. Confirmed Environment

| Item                 | Value                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OS                   | CachyOS (Arch-based), zsh                                                                                                                                               |
| PHP                  | 8.5, extensions `redis`, `pdo_pgsql`, `pcntl` present                                                                                                                   |
| Laravel              | 13.31, Inertia 3.3, `laravel/ai` 0.11.2 (Gemini provider for interaction; no Vertex provider), Fortify, Pest 5                                                          |
| Database             | PostgreSQL 18.6, database `agen_gemma`; `pgvector 0.8.6-1.1` installed and `vector` available, **extension not yet enabled in DB** (requires superuser; `brian` is not) |
| Valkey               | 9.1.2 installed, enabled, active (`valkey-cli ping` → PONG); Laravel `phpredis` client verified against it                                                              |
| Python               | 3.14 system (too new for torch); `uv` 0.12.10 available → pin 3.12                                                                                                      |
| GPU                  | **None on this laptop** (AMD Cezanne iGPU, no CUDA/ROCm); CPU-only dev for HeAR                                                                                         |
| RAM / disk           | 14 GiB RAM (3.7 GiB available), 15 GB free on `/` — no local LLM weights needed (Vertex hosting)                                                                        |
| ffmpeg               | available                                                                                                                                                               |
| JS tooling           | bun 1.4.2, Vite 8                                                                                                                                                       |
| Frontend deps needed | `laravel-echo` 2.5, `@laravel/echo-react` 2.5, `pusher-js`, `laravel/reverb` v1.11.1                                                                                    |
| GCP (supervisor)     | Vertex AI endpoint for MedGemma **not deployed yet** (D14); auth via ADC; project/region/endpoint ID to be provided before live wiring                                  |

**Implication:** realtime interaction latency stays sub-second via Gemini Live. The CPU-only bottleneck is now HeAR only (2–8 s per cough); Vertex handles LLM inference quickly. Cough/briefing remain asynchronous.

---

## 4. Resolved Decisions (O1–O8 Confirmed)

Supervisor accepted all recommendations on 2026-09-10:

| ID  | Decision           | Choice                                                               |
| --- | ------------------ | -------------------------------------------------------------------- |
| O1  | MedGemma call path | Python → Vertex; Laravel calls Python only                           |
| O2  | Cough analysis     | Async queue + Reverb (`202 processing`)                              |
| O3  | pgvector scope     | Audio embeddings + doctor-only similarity now; document RAG deferred |
| O4  | Consent            | Blocking modal, `consented_at` persisted, server-side enforcement    |
| O5  | Audit logging      | Included in Phase 6, including external AI call audit                |
| O6  | Local STT/TTS      | Deferred; Gemini covers `/voice` fallback                            |
| O7  | Vertex model       | MedGemma 4B-it default; model ID env-configurable                    |
| O8  | Vertex outage      | Graceful degrade to classifier-only findings + template briefing     |
| D14 | Vertex endpoint    | Build with fake transport now; wire real endpoint when deployed      |
| D14 | Vertex auth        | ADC (`gcloud auth application-default login`)                        |

---

## 5. Target Architecture

```
┌──────────────────────────── Browser (Inertia React SPA) ────────────────────────────┐
│  consult.tsx   doctor/*.tsx                                                          │
│  • Gemini Live WS (voice duplex + camera presence + barge-in)  ← realtime layer      │
│  • MediaRecorder cough capture        • useEcho (Reverb) clinical updates            │
│  • Consent gate before mic/camera     • Inertia pages / Wayfinder routes             │
└───────────────┬─────────────────────────────────────────────────┬────────────────────┘
                │ Inertia/JSON/SSE + Gemini Live WS               │ WebSocket (Reverb)
                ▼                                                  ▲
┌────────────────────────────── Laravel 13 ────────────────────────┴────────────────────┐
│  app/Domain/Consult  (Actions · DTOs · Enums · Events · Jobs · Services)               │
│  app/Ai/Agents  ConsultAgent (Gemini fallback chat) · no clinical reasoning in Laravel │
│  Queues (Valkey) · Cache (Valkey) · Broadcast (Reverb) · Storage (local)               │
│  PythonAiClient ───────────────────────────────────────────┐                           │
└────────────────────────────────────────────────────────────┼───────────────────────────┘
                                                             │ HTTP (internal token)
                                                             ▼
┌──────────────────────── Python FastAPI (ai-service) ───────────────────────────────────┐
│  /v1/cough/analyze   HeAR embeddings + TB dual-head → Vertex MedGemma explanation      │
│  /v1/briefing        Vertex MedGemma structured clinician briefing                     │
│  /v1/embeddings/audio (HeAR)            /v1/embeddings/text (EmbeddingGemma)          │
│  /v1/vision/analyze (future: chest X-ray / captures via Vertex MedGemma vision)       │
│  (STT/TTS deferred — see O6)                                                           │
└───────────────┬───────────────────────────────────────────┬───────────────────────────┘
                │                                           │ HTTPS (ADC/service acct)
                ▼                                           ▼
        PostgreSQL 18 + pgvector 0.8.6             Google Vertex AI (Model Garden)
        consultations · captures · logs · embeddings  MedGemma 4B-it dedicated endpoint
        (HeAR + classifier run locally on CPU/GPU)  Valkey (queue/cache/broadcast)
```

Interaction paths:

- **Realtime (Gemini)**: greeting, dialogue, barge-in, transcripts. Nothing persisted externally.
- **Clinical (local + Vertex)**: cough audio → HeAR/TB locally → pgvector; explanation and briefing via Vertex MedGemma (pseudonymized) through the Python service; live updates via Reverb.

---

## 6. Phases

Each phase ends with: tests green, `vendor/bin/pint --dirty`, `phpstan analyse`, and a short written summary for review.

### Phase 0 — Baseline & Safety

1. Branch `feat/hybrid-clinical-ai` from `main`.
2. Full suite (`php artisan test --compact`), `phpstan analyse`, `bun run types:check`; record baseline.
3. Database dump to `storage/backups/pre-migration.sql`.
4. Tag baseline `pre-hybrid-migration`.

Acceptance: baseline green; backup exists; no code changes.

---

### Phase 1 — Infrastructure

**Goal:** pgvector enabled, Valkey connected, Reverb installed, GCP access verified.

**Already done:** `pgvector 0.8.6-1.1` installed; Valkey 9.1.2 enabled and active.

Database extension (one-time, **requires superuser** — DB user `brian` has no `CREATE EXTENSION` privilege):

```bash
sudo -u postgres psql -d agen_gemma -c 'CREATE EXTENSION IF NOT EXISTS vector;'
```

The Laravel migration `*_enable_vector.php` also uses `CREATE EXTENSION IF NOT EXISTS vector`; once the superuser has created it, the migration is a safe no-op for `brian`.

Laravel/composer/bun:

```bash
composer require laravel/reverb
php artisan reverb:install
bun add laravel-echo @laravel/echo-react pusher-js
```

GCP/Vertex (supervisor-managed per D13; endpoint deferred per D14):

- No endpoint verification in this phase. When deployed, run:

```bash
gcloud auth application-default login
gcloud config set project <VERTEX_PROJECT>
gcloud ai endpoints list --region=<VERTEX_LOCATION>
```

Record `VERTEX_PROJECT`, `VERTEX_LOCATION`, `VERTEX_ENDPOINT_ID` then; no code changes required (env-only wiring).

Config:

- `.env` / `.env.example`: `QUEUE_CONNECTION=redis`, `CACHE_STORE=redis`, `BROADCAST_CONNECTION=reverb`, `REVERB_*`, `VITE_REVERB_*`, existing `REDIS_*` keys. Laravel's `redis` driver/connection names are retained as-is — protocol-compatible with Valkey, no code or config rename.
- `config/broadcasting.php`: reverb connection.
- `config/services.php`: `ai_service` block (`url`, `token`, `timeout`).
- `routes/channels.php`: private channel `consultation.{consultation}` authorized for owner and doctors.

Acceptance: `valkey-cli ping` → PONG; `SELECT extversion FROM pg_extension WHERE extname='vector'` → 0.8.6; Reverb starts.

---

### Phase 2 — Python Clinical AI Service (standalone)

**Goal:** FastAPI service exposing local audio inference + Vertex MedGemma, testable without weights/credentials (lazy load + graceful degradation).

Layout:

```
ai-service/
├── pyproject.toml               # uv, Python 3.12
├── uv.lock
├── .python-version
├── .env.example
├── README.md
├── scripts/download_models.py   # HeAR, TB head, EmbeddingGemma
├── app/
│   ├── main.py                  # app factory, lifespan preload (configurable)
│   ├── config.py                # pydantic-settings
│   ├── security.py              # X-Internal-Token dependency
│   ├── api/routes/
│   │   ├── health.py
│   │   ├── cough.py
│   │   ├── briefing.py
│   │   ├── embeddings.py
│   │   └── vision.py            # stub 501 until enabled
│   ├── schemas/                 # pydantic request/response models
│   ├── ml/registry.py           # lazy, thread-safe model registry + device detection
│   └── services/
│       ├── audio.py             # ffmpeg decode → 16 kHz mono float32
│       ├── hear.py              # HeAR embedding adapter (transformers)
│       ├── tb_classifier.py     # dual-head TB classifier adapter
│       ├── embeddings.py        # EmbeddingGemma text adapter
│       └── vertex.py            # MedGemma Vertex AI client (predict, vision, structured JSON)
└── tests/                       # pytest with stub adapters + fake Vertex transport
```

API contract (base `/v1`, header `X-Internal-Token`, JSON unless noted):

| Endpoint                 | Input                                                                        | Output                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`            | —                                                                            | `{status, device, models:{hear,classifier,embeddings}, vertex:{reachable, endpoint, model}, versions}`                           |
| `POST /cough/analyze`    | multipart `audio`, `explain: bool`                                           | `{risk_level:"low\|medium\|high\|unclear", risk_score, findings, recommendation, embedding:[512], model, duration_s}`            |
| `POST /briefing`         | `{transcript:[{role,text}], cough:{...}, patient:{age?,sex?,risk_factors?}}` | structured briefing `{chief_complaint, history, risk_factors[], cough_findings, suggested_questions[], red_flags[], disclaimer}` |
| `POST /embeddings/audio` | multipart `audio`                                                            | `{embedding:[...], dim, model}`                                                                                                  |
| `POST /embeddings/text`  | `{texts:[...]}`                                                              | `{embeddings:[[...]], dim, model}`                                                                                               |
| `POST /vision/analyze`   | multipart `image`, `prompt`                                                  | stub `501` until enabled                                                                                                         |

Error envelope: `{error:{code, message, retryable}}`.

Model adapters:

- **HeAR**: `google/hear` gated; `HF_TOKEN`; verify embedding dim (expected 512).
- **TB classifier**: `sach3v/Domain_aware_dual_head_HEar`; adapter isolates loading. If upstream format can't load directly, fall back to a documented head trained on saved HeAR embeddings, same contract.
- **EmbeddingGemma**: `google/embeddinggemma-300m` (768-dim) via sentence-transformers on `AI_DEVICE`.
- **Vertex MedGemma** (`services/vertex.py`):
    - `google-cloud-aiplatform` SDK (`aiplatform.Endpoint`, `use_dedicated_endpoint=True` for Model Garden deployments) with `VERTEX_PROJECT`, `VERTEX_LOCATION`, `VERTEX_ENDPOINT_ID`; auth via ADC (`GOOGLE_APPLICATION_CREDENTIALS` optional).
    - **Deferred wiring (D14):** when `VERTEX_ENDPOINT_ID` is empty, the adapter uses an in-process fake transport and `/health` reports `vertex: not_configured`. The contract (request/response schemas, structured briefing) is frozen by tests so real wiring is env-only.
    - Text and multimodal (base64 image) chat-template prompts; token streaming via `:streamRawPredict` where useful.
    - Structured JSON: schema-in-prompt + pydantic validation + one repair retry; on failure return classifier-only findings.
    - Per-call timeout, retries with jitter on 429/5xx, circuit breaker to report `vertex_unavailable` in `/health`.
    - **Pseudonymization:** never send patient name, email, or identifiers. Caller sends synthetic subject token (e.g. `PATIENT_A`) and de-identified context only. Raw identity stays in Laravel/pgvector.

Operational: bind `127.0.0.1:9000`; lazy load with `PRELOAD_MODELS`; upload/duration caps; reject non-audio; request-ID logging, no PHI.

Tests: health, token rejection, endpoint happy paths with stub adapters, fake Vertex transport, error envelope, pseudonymization guard test (assert no identifier in outbound payload), resample units. No downloads/network in CI.

Acceptance: `uv run pytest` green; uvicorn health reports local adapters and `vertex: not_configured` (fake transport) until the endpoint is deployed; manual cough/briefing calls work with weights present.

---

### Phase 3 — Laravel Clinical Integration

**Goal:** Laravel orchestrates Python for clinical tasks; cough analysis async; briefing generated. Gemini interaction untouched except explicit consent.

Domain structure:

```
app/Domain/Consult/
├── Actions/{StartConsultation, SaveSessionTranscript, RecordCoughSample, AnalyseCoughSample, GenerateBriefing}.php
├── DTOs/{CoughAnalysisResult, VoiceTurnResult, TranscriptTurn, ClinicianBriefing}.php
├── Enums/{ConsultationStatus, RiskLevel}.php
├── Events/{CoughAnalysisCompleted, ConsultationUpdated}.php
├── Exceptions/AiServiceUnavailable.php
├── Jobs/{AnalyseCough, GenerateClinicianBriefing}.php
└── Services/{PythonAiClient, BriefingPayloadBuilder}.php
```

Kept in `app/Models` (idiomatic Laravel): `Consultation`, `ConsultCapture`, `ConsultSessionLog`, `User`.

Agents:

- `ConsultAgent` — stays Gemini (fallback text chat only).
- `CoughAnalysisAgent` — **removed**; replaced by Python pipeline.
- `ClinicianBriefingAgent` — **not created** (no Vertex provider in `laravel/ai`; O1a). Briefing goes through `PythonAiClient::briefing()`.

Controller changes (`Consult/ConsultationController`):

- `chat()` / `voice()` / `liveToken()` / session logs / captures — behavior preserved.
- `cough()` — stores capture, dispatches `AnalyseCough`, returns `202 {status:"processing", capture_id}`.
- `briefing()` — dispatches `GenerateClinicianBriefing`, returns `202` (or synchronous when already cached).
- Consent endpoint: `POST consult/{consultation}/consent` → persists `consented_at`.
- Migration: `consultations.consented_at` timestamp nullable.

Removal list:

- `app/Ai/Agents/CoughAnalysisAgent.php`
- Gemini envs remain (`GEMINI_API_KEY`, `GEMINI_URL`) — interaction layer only.
- `resources/js/lib/gemini-live.ts`, `resources/js/lib/live-audio.ts` — **kept**.

Testing:

- `Http::fake()` for `PythonAiClient` (assert payload shape, map responses).
- `Queue::fake()` + `Event::fake()` for dispatch paths.
- `Agent::fake()` for Gemini fallback chat.
- Update consult tests to async cough flow; new client retry/timeout/error tests; consent test; briefing persistence test.

Acceptance: cough analysis runs through Python/Vertex asynchronously; briefing job works; no clinical reasoning calls Gemini directly; suite green.

---

### Phase 4 — Reverb + Echo + Consent UX

**Goal:** live clinical updates; consent gate; realtime interaction preserved.

Frontend:

- `resources/js/components/consent-gate.tsx` — blocking modal before mic/camera. Copy explains: live conversation audio/video is processed by Google Gemini for the session and is not stored externally; cough findings and de-identified clinical text are sent to our Google Vertex AI MedGemma service; recordings/captures are stored locally for the doctor. Posts consent, then enables interaction.
- `resources/js/pages/consult.tsx` — keep Gemini Live loop; cough handler: POST `/cough` → `202` → `useEcho` on `consultation.{id}` updates assessment + risk badge live.
- `resources/js/pages/doctor/index.tsx` + `show.tsx` — `useEcho` for live updates; briefing panel placeholder wired in Phase 5.

Backend:

- `routes/channels.php` authorization (owner or doctor).
- Queue worker + Reverb systemd units (Appendix A).

Acceptance: consent enforced before Live starts; cough result appears without refresh; doctor console updates live; interactive voice/camera unaffected.

---

### Phase 5 — pgvector, Embeddings & Clinician Briefing

**Goal:** vector storage/similarity + Vertex MedGemma briefing surfaced to doctors.

Migrations:

```
cough_embeddings: id, consultation_id FK, capture_id FK nullable, embedding vector(512),
                  model, created_at, INDEX hnsw (embedding vector_cosine_ops)
document_embeddings (deferred per O3): id, source, title, content, metadata jsonb,
                  embedding vector(768), timestamps
```

- Dedicated migration `CREATE EXTENSION IF NOT EXISTS vector`.
- `AnalyseCough` stores embedding + risk score.

Briefing:

- `GenerateClinicianBriefing` builds pseudonymized payload (subject token, age band, sex, risk factors, transcript, cough findings) → Python `POST /v1/briefing` → structured report persisted to `consultations.report`.
- Broadcast `ConsultationUpdated`; doctor UI card + "Regenerate" action (POST `doctor/consultations/{id}/briefing`, `EnsureDoctor`).

Similarity:

- Doctor-only `FindSimilarCoughs` action; `doctor/consultations/{id}/similar` endpoint; no raw vectors returned.

Tests: extension/migration idempotency, embedding persistence, briefing with fake Python, doctor authorization, similarity ordering with seeded vectors.

Acceptance: embeddings stored; briefing visible; similarity doctor-only.

---

### Phase 6 — Security, Audit & Hardening

**Goal:** meet `OVERVIEW.md` privacy requirements, including the Vertex external-processing path.

1. **Audit log**: `audit_logs` + recorder for patient-data access/export and **external AI calls** (Vertex briefing/explanation, Gemini live session start) — actor, subject, action, destination, timestamp, IP. No prompt content stored.
2. **Signed capture downloads**: temporary signed URLs; owner/doctor authorization.
3. **Rate limiting**: throttle consult voice/chat/cough and Python ingress.
4. **RBAC**: `EnsurePatient`/`EnsureDoctor` on all new routes; `Consultation` policy; server-side consent enforcement before cough/voice.
5. **Data hygiene**: identifiers never sent to Vertex (pseudonymization guard test in Python + payload builder test in Laravel); IDs only in queue payloads; no PHI in logs.
6. **GCP posture**: Vertex region pinned; data-processing terms accepted; service account least-privilege (`roles/aiplatform.user`); document whether BAA applies for the deployment context.
7. **Secrets**: `.env` only; `AI_SERVICE_TOKEN`, `GOOGLE_APPLICATION_CREDENTIALS` rotation documented.
8. **Docs**: runbooks for ai-service, Vertex endpoint, Valkey, Reverb, queue worker; backup/restore.

Tests: audit records (including external call), signed URL expiry, throttling, consent enforcement, policy checks, pseudonymization guard.

Acceptance: audit trail demonstrable; no unsigned PHI download; throttles and consent verified; no identifiers in Vertex payloads.

---

### Phase 7 (Optional, deferred per O6) — Local STT/TTS Fallback

Only if a Gemini-free fallback is later required: add faster-whisper + Kokoro to `ai-service` and wire the turn-based `/voice` fallback to them. No interaction-layer changes.

---

## 7. File-Level Impact Summary

| Action          | Path                                                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New service     | `ai-service/**`                                                                                                                                                                        |
| New domain      | `app/Domain/Consult/**`, `app/Domain/Audit/**`                                                                                                                                         |
| Removed         | `app/Ai/Agents/CoughAnalysisAgent.php`                                                                                                                                                 |
| Updated         | `app/Http/Controllers/Consult/ConsultationController.php` (domain actions, async cough, briefing, consent)                                                                             |
| Kept            | `app/Ai/Agents/ConsultAgent.php` (Gemini fallback chat)                                                                                                                                |
| Kept            | `resources/js/lib/gemini-live.ts`, `resources/js/lib/live-audio.ts`                                                                                                                    |
| New JS          | `resources/js/components/consent-gate.tsx`                                                                                                                                             |
| Rewritten       | `resources/js/pages/consult.tsx` (consent + Echo cough; Live loop unchanged)                                                                                                           |
| Updated         | `resources/js/pages/doctor/index.tsx`, `doctor/show.tsx` (live + briefing)                                                                                                             |
| New             | `app/Domain/Consult/Services/PythonAiClient.php`                                                                                                                                       |
| New migrations  | `*_enable_vector.php`, `*_add_consent_to_consultations.php`, `*_create_cough_embeddings_table.php`, `*_create_audit_logs_table.php`, deferred `*_create_document_embeddings_table.php` |
| Updated config  | `.env.example`, `config/broadcasting.php`, `config/queue.php`, `config/cache.php`, `config/services.php`                                                                               |
| Updated routing | `routes/web.php` (consent, briefing, similar), `routes/channels.php`                                                                                                                   |
| Infra           | systemd units for `ai-service`, `reverb`, `queue-worker`; CI Python job                                                                                                                |
| Rules           | update `.ai/rules/consult.md`, `pages.md`, `doctor.md`; add `ai-service.md` via `record-rule`                                                                                          |

---

## 8. Environment Variables

Laravel `.env` additions:

```dotenv
AI_SERVICE_URL=http://127.0.0.1:9000
AI_SERVICE_TOKEN=change-me
AI_SERVICE_TIMEOUT=300

QUEUE_CONNECTION=redis
CACHE_STORE=redis
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

Kept: `GEMINI_API_KEY`, `GEMINI_URL` (interaction layer). No Ollama env anywhere.

`ai-service/.env`:

```dotenv
AI_DEVICE=auto                # auto|cpu|cuda
AI_SERVICE_TOKEN=change-me
PRELOAD_MODELS=               # empty on CPU dev
HF_TOKEN=
HEAR_MODEL=google/hear
TB_CLASSIFIER_MODEL=sach3v/Domain_aware_dual_head_HEar
EMBEDDING_MODEL=google/embeddinggemma-300m
MAX_UPLOAD_MB=25

# Vertex AI (MedGemma)
VERTEX_PROJECT=
VERTEX_LOCATION=us-central1
VERTEX_ENDPOINT_ID=
VERTEX_MEDGEMMA_MODEL=medgemma-4b-it       # Model Garden publisher model / version label
GOOGLE_APPLICATION_CREDENTIALS=            # empty = ADC
VERTEX_TIMEOUT_S=60
```

---

## 9. Performance Budget

| Operation                        | Path                   | CPU dev (this laptop) | Notes              |
| -------------------------------- | ---------------------- | --------------------- | ------------------ |
| Voice turn (Gemini Live)         | Remote                 | < 1 s                 | unchanged          |
| Turn-based fallback /voice       | Remote (Gemini)        | 1–3 s                 | unchanged          |
| HeAR embedding, 5 s cough        | Local                  | 2–8 s                 | CPU bottleneck     |
| TB classifier head               | Local                  | < 0.5 s               |                    |
| MedGemma cough explanation       | Vertex                 | 1–3 s                 | network + endpoint |
| Clinician briefing               | Vertex, queued         | 3–10 s                | network + endpoint |
| **Cough analysis total (async)** | Local + Vertex, queued | **3–12 s**            | HeAR dominates     |

Realtime UX is unaffected. Cough/briefing remain asynchronous with Reverb updates.

---

## 10. Risks & Mitigations

| Risk                                            | Likelihood | Impact | Mitigation                                                                                                          |
| ----------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| PHI sent to Vertex                              | Medium     | High   | D12 pseudonymization (guard tests both sides), consent copy, audit of external calls, region pinning                |
| Vertex endpoint cost (GPU min-replica)          | Medium     | Medium | 4B default (O7a); endpoint supervisor-managed; batch-like async usage; document cost expectations                   |
| Vertex endpoint deferred (D14)                  | Confirmed  | Medium | Fake transport + frozen contract tests; wiring is env-only when supervisor deploys; health reports `not_configured` |
| Vertex availability / quota / cold start        | Medium     | Medium | Timeouts + retries + circuit breaker; graceful `unclear`/template fallback (O8a); health reports reachability       |
| Consent/privacy incident (live media to Gemini) | Medium     | High   | Blocking consent gate (O4), server-side enforcement, no external persistence, audit log                             |
| HeAR gated download / repo loading issues       | Medium     | High   | Adapter isolation; `HF_TOKEN`; documented fallback classifier; health endpoint reports model state                  |
| Dual-head repo not a standard checkpoint        | Medium     | Medium | Inspect first task of Phase 2; wrap custom loading or export head on saved embeddings                               |
| HeAR CPU latency                                | High       | Low    | Async queue + Reverb; GPU-ready env switch; processing states in UI                                                 |
| pgvector extension privilege                    | Confirmed  | Medium | One-time `CREATE EXTENSION` as `postgres` (Phase 1); migration uses `IF NOT EXISTS`                                 |
| 15 GB free disk                                 | Medium     | Medium | No local LLM weights (Vertex); quantized HeAR only; purge uv/pip caches                                             |
| Vertex structured-output drift                  | Medium     | Low    | Schema prompt + pydantic validation + one repair retry; classifier-only fallback                                    |
| Queue/Valkey outage loses jobs                  | Low        | Medium | Valkey persistence (RDB/AOF), `failed_jobs`, retries with backoff                                                   |
| Gemini dependency retained                      | Accepted   | Medium | Scope-limited to interaction; clinical data never sent to Gemini                                                    |

---

## 11. Verification Strategy

1. **Static:** `vendor/bin/pint --dirty`, `phpstan analyse`, `bun run types:check`, `bun run check`.
2. **Laravel:** `php artisan test --compact` after each phase.
3. **Python:** `uv run pytest` + `ruff` in `ai-service`.
4. **Contracts:** Pest asserts exact payloads sent to Python; pytest asserts exact response schemas — frozen in Phase 3. Include pseudonymization guard.
5. **E2E manual script:** consent → Gemini Live greeting → voice interview → cough → Reverb update → doctor login → transcript, cough analysis, briefing → capture download.
6. **Vertex smoke:** endpoint call with synthetic payload; verify no identifiers in request logs.
7. **Load smoke:** 5 concurrent cough jobs; queue drains; UI updates.

---

## 12. Rollback Plan

- Work on `feat/hybrid-clinical-ai`; `main` untouched; baseline tag `pre-hybrid-migration`.
- DB backup at `storage/backups/pre-migration.sql`.
- Each phase is a separate commit group; revert phase or branch.
- Gemini interaction layer untouched until consent (Phase 4), so the working MVP stays shippable throughout.
- Vertex outage falls back to classifier-only findings + template briefing; no hard dependency for app availability.

---

## 13. Definition of Done

- [ ] All phases accepted by supervisor.
- [ ] Realtime interaction preserved: Gemini Live voice + camera presence + barge-in.
- [ ] Consent gate enforced server-side; consent timestamp persisted; copy discloses Gemini and Vertex processing.
- [ ] Cough screening local (HeAR + TB head); explanation via Vertex MedGemma; async with live UI updates.
- [ ] Clinician briefing generated via Vertex MedGemma; persisted; doctor UI with regenerate.
- [ ] No clinical data sent to Gemini; no identifiers sent to Vertex.
- [ ] Doctor console: live updates, transcripts, cough analysis, briefing, signed capture downloads.
- [ ] pgvector stores cough embeddings; doctor-only similarity endpoint works.
- [ ] Audit logging (including external AI calls) + throttling in place; `.ai/rules` updated.
- [ ] Pest + pytest + static checks green; CI updated; runbooks written.

---

## Appendix A — systemd Unit Templates

`/etc/systemd/system/ai-service.service`

```ini
[Unit]
Description=Clinic AI FastAPI Service
After=network-online.target

[Service]
Type=simple
User=brian
WorkingDirectory=/home/brian/Documents/Campus/agentic-medgemma/ai-service
EnvironmentFile=/home/brian/Documents/Campus/agentic-medgemma/ai-service/.env
ExecStart=/usr/bin/uv run uvicorn app.main:app --host 127.0.0.1 --port 9000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/reverb.service`

```ini
[Unit]
Description=Laravel Reverb WebSocket Server
After=network.target valkey.service

[Service]
Type=simple
User=brian
WorkingDirectory=/home/brian/Documents/Campus/agentic-medgemma
ExecStart=/usr/bin/php artisan reverb:start --host=127.0.0.1 --port=8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/clinic-queue.service`

```ini
[Unit]
Description=Laravel AI Queue Worker
After=network.target valkey.service

[Service]
Type=simple
User=brian
WorkingDirectory=/home/brian/Documents/Campus/agentic-medgemma
ExecStart=/usr/bin/php artisan queue:work --queue=ai,default --tries=3 --timeout=300
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Appendix B — Model Inventory

| Model                                           | Source                               | Role                                       | Location                     |
| ----------------------------------------------- | ------------------------------------ | ------------------------------------------ | ---------------------------- |
| MedGemma 4B-it multimodal (Model Garden v1.5.0) | Google Vertex AI endpoint            | cough explanation, briefing, future vision | Supervisor GCP project (D13) |
| MedGemma 27B-it (optional)                      | Google Vertex AI endpoint            | higher-quality reasoning if provisioned    | Supervisor GCP project       |
| HeAR (`google/hear`)                            | HF (gated)                           | cough embeddings                           | local CPU/GPU                |
| Domain-aware dual-head                          | `sach3v/Domain_aware_dual_head_HEar` | TB risk head                               | local CPU/GPU                |
| EmbeddingGemma-300M                             | `google/embeddinggemma-300m`         | text embeddings (768)                      | local CPU/GPU                |
| (deferred O6) faster-whisper + Kokoro | CTranslate2 / ONNX | offline STT/TTS fallback | local |

---

## Appendix C — Local Runbook

No systemd units are used. Development runs from two terminals:

```bash
# Terminal 1 — server, pail logs, vite, reverb, queue (ai + default)
composer run dev

# Terminal 2 — Python AI service
cd ai-service && uv run uvicorn app.main:app --host 127.0.0.1 --port 9000
```

Health checks:
```bash
curl -s -H "X-Internal-Token: $AI_SERVICE_TOKEN" http://127.0.0.1:9000/v1/health
valkey-cli ping
php artisan about | grep -iE 'queue|broadcast|cache'
```

One-time database steps (superuser required for the extension):
```bash
sudo -u postgres psql -d agen_gemma -c 'CREATE EXTENSION IF NOT EXISTS vector;'
sudo -u postgres psql -d ':memory:' -c 'CREATE EXTENSION IF NOT EXISTS vector;'   # test database
```

Secrets and rotation:
- `AI_SERVICE_TOKEN` lives in the root `.env` and `ai-service/.env`; they must match. Rotate by generating a new value in both files and restarting the Python service.
- `GEMINI_API_KEY` powers the interaction layer only. `HF_TOKEN` (ai-service) downloads gated HeAR weights.
- Vertex credentials come from ADC (`gcloud auth application-default login`) or `GOOGLE_APPLICATION_CREDENTIALS`; never commit key files.

Troubleshooting:
- `reverb:start` fails with "Address already in use" → another Reverb process holds 8080; kill it and let `composer run dev` own the process.
- Cough jobs never finish → confirm the dev queue pane is `queue:ai` and not a default-only listener.
- `/v1/health` shows models `loaded: false` → run `uv sync --extra ml` and download weights; the app still degrades to `unclear`.
- `vertex.mode: fake` → set `VERTEX_PROJECT`, `VERTEX_LOCATION`, `VERTEX_ENDPOINT_ID` once the Model Garden endpoint is deployed.
- Capture download returns 403 → links are temporary signed URLs generated by the doctor console; unsigned or expired links are rejected by design.
