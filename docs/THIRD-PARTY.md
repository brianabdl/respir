# Third-Party Components and Licenses

Respir itself is MIT-licensed ([LICENSE](../LICENSE)). It builds on third-party
models, services, and libraries that carry their own terms. The models matter
most: two of them are gated, and one is a hosted service with its own acceptable
use policy.

Verify each license before any commercial or clinical deployment. The summaries
below are for orientation, not legal advice.

## Models

| Model | Source | Terms | Used for |
| --- | --- | --- | --- |
| **HeAR** (`google/hear-pytorch`) | Google, Hugging Face | Health AI Developer Foundations terms; **gated** — access must be requested | Cough audio → 512-dim health acoustic embedding |
| **TB dual-head classifier** (`sach3v/Domain_aware_dual_head_HEar`) | Hugging Face community model | Per the model card on Hugging Face | Embedding → TB risk score |
| **MedGemma** (`medgemma-4b-it`) | Google, via Vertex AI Model Garden | Health AI Developer Foundations terms + Google Cloud terms | Plain-language explanation, clinician briefing |
| **EmbeddingGemma** (`google/embeddinggemma-300m`) | Google, Hugging Face | Gemma Terms of Use | Text embeddings for recall and similarity |
| **Cough gate** | Trained locally by the operator | Yours | Rejecting non-cough audio before scoring |

Notes that matter in practice:

- **Gated access.** HeAR requires an accepted access request on Hugging Face and
  an `HF_TOKEN` with that access. This is why `scripts/download_models.py` needs
  a token and why a clone without one runs in degraded mode.
- **No weights are committed.** `ai-service/models/` is gitignored. Weights are
  downloaded at setup time, and `models/cough_gate.joblib` is a personal artifact
  that must not be shared — it encodes voice characteristics.
- **Health AI Developer Foundations models are for research and development.**
  They are not medical devices. See the clinical status note in
  [AI-PIPELINE.md](AI-PIPELINE.md).

## Hosted services

| Service | Role | Terms |
| --- | --- | --- |
| **Gemini Live API** (`gemini-3.1-flash-live-preview`) | Realtime voice interaction only — speech, transcripts, barge-in | Google APIs Terms of Service, Gemini API additional terms. Preview API: behavior may change |
| **Google Vertex AI** (Model Garden) | Hosts the MedGemma endpoint | Google Cloud Platform Terms of Service |
| **Let's Encrypt** (via Caddy) | TLS certificates | ISRG subscriber agreement |
| **Hugging Face Hub** | Weight distribution | Hugging Face terms; per-model licenses apply |

Both Google services are optional. Without them the app runs with a text
fallback for the interview and template briefings.

## Backend (PHP)

| Package | License |
| --- | --- |
| `laravel/framework` 13 | MIT |
| `laravel/ai` 0.11 | MIT |
| `laravel/fortify` | MIT |
| `laravel/reverb` | MIT |
| `laravel/wayfinder` | MIT |
| `laravel/tinker`, `laravel/chisel` | MIT |
| `inertiajs/inertia-laravel` 3 | MIT |
| `barryvdh/laravel-dompdf` | MIT (wraps dompdf, LGPL-3.0) |

Dev: `pestphp/pest` 5, `larastan/larastan`, `laravel/pint`, `laravel/pail`,
`laravel/boost`, `laravel/pao`, `laravel/sail`, `mockery/mockery`,
`nunomaduro/collision`, `fakerphp/faker` — all MIT.

Full resolved tree with versions: `composer.lock` (`composer licenses`).

## Frontend (JavaScript)

| Package | License |
| --- | --- |
| `react`, `react-dom` 19 | MIT |
| `@inertiajs/react`, `@inertiajs/vite` 3 | MIT |
| `@laravel/echo-react`, `laravel-echo`, `pusher-js` | MIT |
| `tailwindcss` 4, `@tailwindcss/vite` | MIT |
| `vite` 8, `@vitejs/plugin-react`, `laravel-vite-plugin` | MIT |
| `@radix-ui/*` | MIT |
| `lucide-react` | ISC |
| `framer-motion`, `lenis`, `sonner`, `recharts`, `react-day-picker`, `yet-another-react-lightbox`, `@tiptap/*` | MIT |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` | MIT |
| `typescript` | Apache-2.0 |

UI primitives follow the shadcn/ui pattern (MIT) and live in the repository as
project source rather than as a dependency.

Full resolved tree: `bun.lock`.

### Fonts

Inter and JetBrains Mono, both SIL Open Font License 1.1, self-hosted through the
Laravel Vite font plugin — no external font CDN at runtime.

## AI service (Python)

| Package | License |
| --- | --- |
| `fastapi`, `uvicorn` | MIT / BSD-3-Clause |
| `pydantic`, `pydantic-settings` | MIT |
| `httpx`, `python-multipart` | BSD-3-Clause / Apache-2.0 |
| `numpy` | BSD-3-Clause |
| `soundfile` (libsndfile) | BSD-3-Clause / LGPL-2.1 |
| `pillow` | MIT-CMU |
| `torch`, `transformers`, `accelerate`, `huggingface-hub`, `sentence-transformers` | BSD-3-Clause / Apache-2.0 |
| `scikit-learn` | BSD-3-Clause |
| `xgboost` | Apache-2.0 |
| `google-cloud-aiplatform` | Apache-2.0 |

Dev: `pytest` (MIT), `ruff` (MIT). Full resolved tree: `ai-service/uv.lock`.

## System dependencies

| Tool | License | Role |
| --- | --- | --- |
| **ffmpeg** | LGPL-2.1+ / GPL-2.0+ depending on build | Decoding uploads to 16 kHz mono |
| **PostgreSQL** 18 | PostgreSQL License | Primary datastore |
| **pgvector** | PostgreSQL License | Vector column and HNSW index |
| **Valkey** | BSD-3-Clause | Queues, cache, sessions |
| **Caddy** | Apache-2.0 | TLS termination and static serving |
| **Docker images** | `pgvector/pgvector`, `valkey/valkey`, `caddy`, `php`, `oven/bun` — upstream licenses apply |

An ffmpeg build's license depends on its configuration; a GPL build imposes GPL
obligations on distribution of a combined work. Distributing Respir as a bundled
appliance means checking which build is included.

## Data and research

No patient data is distributed with this repository. Test fixtures under
`tests/` are synthetic.

The clinical framing draws on published work cited in the project proposal,
including the WHO *Global Tuberculosis Report 2025* (CC BY-NC-SA 3.0 IGO) and
peer-reviewed research on cough acoustic analysis. Citations are in the proposal
document, not in code.

## Development tooling in this repository

Respir was built with AI-assisted tooling, and the configuration for it is
committed on purpose so the workflow is reproducible: `CLAUDE.md`, `AGENTS.md`,
`.ai/rules/`, `boost.json`, `.mcp.json`, `opencode.json`. These files affect
development only; they are not part of the running application.
