<h1 align="center">Respir</h1>

<p align="center">
  <strong>Agentic AI-powered acoustic screening for early tuberculosis detection.</strong><br/>
  A guided voice pre-visit, a cough-based TB screen, and a structured clinician briefing — before the door opens.
</p>

<p align="center">
  <a href="https://respir.brianabdl.my.id"><strong>Live demo →</strong></a> ·
  <a href="docs/">Technical documentation</a> ·
  <a href="docs/INSTALLATION.md">Installation</a> ·
  <a href="docs/API.md">API</a>
</p>

<p align="center">
  <img alt="Laravel 13" src="https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white">
  <img alt="PHP 8.5" src="https://img.shields.io/badge/PHP-8.5-777BB4?logo=php&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Python 3.12" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="PostgreSQL + pgvector" src="https://img.shields.io/badge/PostgreSQL-18%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white">
  <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-green">
</p>

---

## The problem

Indonesia carries about 10% of the global tuberculosis burden, second only to
India. Roughly 1,090,000 new cases and 125,000 deaths are estimated each year,
while around 885,000 cases were actually found in 2024. The rest went
undiagnosed, untreated, and still infectious.

The bottleneck is triage, not treatment. Xpert cartridges, culture, and chest
X-ray are too scarce to give to everyone who walks in with a cough, so somebody
has to decide who gets tested first — and today that decision is made
informally, by whichever clinician is on duty.

## What Respir does

Respir is a **triage layer that runs before confirmatory testing** and costs
close to nothing per patient.

1. **Guided voice interview.** The patient talks to Sage, an AI voice agent that
   asks pre-visit questions one at a time, handles interruptions, and records
   the transcript.
2. **Cough screen.** The patient coughs toward an ordinary phone or clinic
   microphone. The recording is analyzed locally into a `low` / `medium` /
   `high` / `unclear` TB risk band.
3. **Clinician briefing.** The doctor opens a decision-ready summary — chief
   complaint, history, risk factors, cough findings, suggested questions, red
   flags — plus a similarity lookup against comparable past coughs.

No specialist hardware, no laboratory, no trained operator.

## Live demo

**https://respir.brianabdl.my.id**

Register an account to walk through the patient flow. The demo instance runs the
real ML stack on CPU with no GPU and no Vertex AI endpoint, so briefings are
template-generated and marked `degraded`, and the personal cough gate is
untrained — meaning non-cough audio can still receive a score. Those are the
documented degraded modes, not bugs; see
[AI-PIPELINE.md](docs/AI-PIPELINE.md#degradation-summary).

> **Respir is a screening aid, not a diagnostic device.** It is not cleared or
> approved by any medical regulator, and its thresholds have not been validated
> against microbiological reference standards.

## Architecture at a glance

```
Browser (Inertia React SPA)
  · Gemini Live — voice, transcripts, barge-in, camera presence
  · MediaRecorder cough capture · useEcho (Reverb) live updates
         │ Inertia / JSON                        ▲ Reverb WebSocket
         ▼                                       │
Laravel 13 — consent · consultations · queues · broadcasting · audit
         │ HTTP (X-Internal-Token)
         ▼
Python FastAPI (ai-service)
  · /v1/cough/analyze   HeAR + TB dual-head + MedGemma explanation
  · /v1/briefing        de-identified clinician briefing
         │                         │ HTTPS (ADC)
         ▼                         ▼
PostgreSQL 18 + pgvector    Vertex AI Model Garden (MedGemma)
```

Four rules the codebase enforces:

- **Gemini is interaction-only.** Cough analysis, clinical reasoning, and
  briefings never route to Gemini.
- **Direct identifiers never leave the host.** Names become subject tokens and
  the Python payload model rejects identifying fields outright (`extra="forbid"`).
- **Cough analysis is asynchronous.** `POST /cough` returns `202`, a job runs on
  the `ai` queue, and the result arrives over the `cough.analysis` Reverb event.
- **Everything degrades instead of blocking.** Missing weights yield `unclear`;
  missing Vertex yields a template briefing marked `degraded: true`; jobs retry
  with backoff and always broadcast a final state.

Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Features

- **Realtime voice interview** — conversational turn-taking, live transcripts,
  barge-in, optional camera presence.
- **Cough-based TB screening** — HeAR embeddings plus a TB dual-head classifier,
  with a median across takes so one unlucky recording does not set the risk.
- **Acoustic similarity search** — pgvector HNSW cosine index over 512-dim cough
  embeddings surfaces comparable past cases.
- **Structured clinician briefing** — generated by MedGemma from a de-identified
  transcript, with a template fallback that is clearly marked as degraded.
- **Doctor review console** — triage queue with risk filters, transcript, cough
  analysis, media captures, clinical notes, follow-up actions, PDF export.
- **Consent-first design** — a server-enforced gate guards microphone, camera,
  and cough capture. Missing consent is a 403, not a hidden button.
- **Full auditability** — every patient-data access and external AI call lands in
  an append-only audit log that never contains clinical content.

## Technology stack

| Layer           | Technology                                                               |
| --------------- | ------------------------------------------------------------------------ |
| Backend         | Laravel 13 · PHP 8.5 · `laravel/ai` 0.11 · Laravel Fortify               |
| Frontend        | Inertia v3 · React 19 · TypeScript · Tailwind CSS 4 · Vite 8 · Wayfinder |
| Realtime voice  | Gemini Live API (`gemini-3.1-flash-live-preview`) — interaction only     |
| Realtime push   | Laravel Reverb + `@laravel/echo-react` (no polling)                      |
| AI microservice | Python 3.12 · FastAPI · uvicorn                                          |
| Audio ML        | HeAR embeddings · TB dual-head classifier · personal cough gate          |
| Text embeddings | EmbeddingGemma                                                           |
| Clinical LLM    | MedGemma on Google Vertex AI (optional; fake/template mode without it)   |
| Data            | PostgreSQL 18 + pgvector (HNSW cosine)                                   |
| Queue & cache   | Valkey (Redis-compatible; the `redis` driver name is intentional)        |
| Audio pipeline  | ffmpeg — decoding any upload to 16 kHz mono                              |
| Testing         | Pest 5 · Larastan · Pint · pytest · ruff, both suites in CI              |
| Deployment      | Docker Compose — web, app, queue, reverb, ai-service, db, redis          |

## Repository structure

```
app/
├── Ai/Agents/            ConsultAgent — Sage's conversation and turn logic
├── Domain/
│   ├── Audit/            AuditLogger · AuditAction
│   └── Consult/          Actions · DTOs · Enums · Events · Jobs · Services
├── Http/Controllers/     Consult (patient flow) · Doctor (review console)
└── Models/               Consultation · ConsultCapture · ConsultSessionLog · …
ai-service/               Python FastAPI microservice — all clinical inference
resources/js/             Inertia React SPA — consult room, doctor console, landing
database/migrations/      Schema, including the pgvector column and HNSW index
tests/                    Feature, security, and contract tests
docs/                     Technical documentation (start at docs/README.md)
```

## Quick start

Full instructions, including Docker: [docs/INSTALLATION.md](docs/INSTALLATION.md).

**Prerequisites:** PHP 8.5 (`pdo_pgsql`, `redis`, `pcntl`), Composer 2, Bun 1.4+,
PostgreSQL 18 with pgvector, Valkey, Python 3.12 via [uv](https://docs.astral.sh/uv/),
and ffmpeg on `PATH`.

```bash
git clone https://github.com/brianabdl/agentic-med-gemma.git respir
cd respir

composer install && bun install
cp .env.example .env && php artisan key:generate
```

Create the database and the extension (superuser, once):

```bash
sudo -u postgres createdb agen_gemma
sudo -u postgres psql -d agen_gemma -c 'CREATE EXTENSION IF NOT EXISTS vector;'
```

Set `AI_SERVICE_TOKEN` in `.env` (any random string), then:

```bash
php artisan migrate
php artisan db:seed          # optional demo accounts and consultations
bun run build
```

Set up the Python service — `AI_SERVICE_TOKEN` must match the root `.env`:

```bash
cd ai-service
cp .env.example .env
uv sync --extra ml --extra vertex
HF_TOKEN=... uv run scripts/download_models.py   # gated HeAR weights; optional
```

Run it, in two terminals:

```bash
composer run dev                                                  # serve, vite, reverb, pail, queues
cd ai-service && uv run uvicorn app.main:app --port 9000          # AI service
```

Seeded demo accounts (local only, password `password`):
`patient@demo.test` and `doctor@demo.test`.

Respir runs without a Gemini key, without the gated weights, and without Google
Cloud. In that state cough analysis returns `unclear` and briefings come from a
template — everything else works.

## Testing

```bash
composer test                                   # Pint + PHPStan + Pest
composer pest                                   # Pest only (129 tests)
cd ai-service && uv run pytest && uv run ruff check .
bun run types:check && bun run check
```

Pest runs against a real PostgreSQL database — see
[docs/TESTING.md](docs/TESTING.md) for the one-time `:memory:` database setup.
Both suites run in CI on every push and pull request.

## Documentation

| Document                                       | Contents                                              |
| ---------------------------------------------- | ----------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | Services, request paths, enforced boundaries          |
| [docs/INSTALLATION.md](docs/INSTALLATION.md)   | Native and Docker setup, troubleshooting              |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Every environment variable, both services             |
| [docs/API.md](docs/API.md)                     | HTTP endpoints, WebSocket events, internal AI API     |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md)       | Tables, ERD, pgvector index, retention                |
| [docs/AI-PIPELINE.md](docs/AI-PIPELINE.md)     | Cough screening and briefing, thresholds, degradation |
| [docs/SECURITY.md](docs/SECURITY.md)           | Consent, de-identification, audit, limitations        |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)       | Compose stack, TLS, Vertex wiring, operations         |
| [docs/TESTING.md](docs/TESTING.md)             | Suites, coverage, CI                                  |
| [docs/THIRD-PARTY.md](docs/THIRD-PARTY.md)     | Models, services, libraries, licenses                 |

`ai-service/README.md` documents the Python service on its own terms.

## Impact

- **Public health.** The target is the WHO triage-test profile: at least 90%
  sensitivity at 70% specificity — clearing low-risk coughs without missing real
  cases, wherever patients first show up.
- **Economics.** Every molecular cartridge spent on a low-risk patient is one
  unavailable to a high-risk one. Filtering first lowers cost per detected case.
- **Health system.** The interview and briefing happen before the visit, so a
  five-minute consultation starts from structured data instead of a blank page.
- **Equity.** Commodity microphones, local inference, cloud optional — usable
  where an X-ray van or a GeneXpert machine is a day's travel away.
- **Trust.** Consent first, audio processed on the clinic's own hardware, no
  identifiers to external models.

Aligned with **SDG 3** (Good Health and Well-being, Target 3.3) and **SDG 9**
(Industry, Innovation and Infrastructure).

## Team

Built for the **GAYATAMA 5 International Web Technology Competition**,
Universitas Negeri Surabaya — theme _"Innovating for a Sustainable Future:
Empowering Communities through Web Technology."_

- Muhammad Brian Abdillah
- Candra Febriyanto
- Adam Nirvana
- Abdullah Masykur

## Acknowledgments

Respir builds on Google's HeAR and MedGemma (Health AI Developer Foundations),
EmbeddingGemma, a community TB dual-head classifier, and the Laravel, React, and
FastAPI ecosystems. Models and libraries carry their own licenses — see
[docs/THIRD-PARTY.md](docs/THIRD-PARTY.md).

Development used AI-assisted tooling, and its configuration is committed
deliberately (`CLAUDE.md`, `AGENTS.md`, `.ai/rules/`, `boost.json`) so the
workflow is reproducible. Those files affect development only, not the running
application.

## License

[MIT](LICENSE).
