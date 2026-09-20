# Configuration

Respir reads two environment files: `.env` for Laravel and `ai-service/.env` for
the Python service. Templates live at `.env.example`, `ai-service/.env.example`,
and `.env.production.example`. None of the real files are committed.

One value must match across both services: **`AI_SERVICE_TOKEN`**. It is the
shared secret on the `X-Internal-Token` header, and a mismatch shows up as `401`
on every clinical call.

## Laravel (`.env`)

### Application

| Variable    | Default                 | Purpose                                                           |
| ----------- | ----------------------- | ----------------------------------------------------------------- |
| `APP_NAME`  | `Laravel`               | Displayed name; also inlined into the frontend as `VITE_APP_NAME` |
| `APP_ENV`   | `local`                 | `local` or `production`                                           |
| `APP_KEY`   | —                       | Required. `php artisan key:generate`                              |
| `APP_DEBUG` | `true`                  | Must be `false` in production                                     |
| `APP_URL`   | `http://localhost:8000` | Used for signed URLs and mail links                               |

### Database

| Variable                      | Default              | Purpose                                 |
| ----------------------------- | -------------------- | --------------------------------------- |
| `DB_CONNECTION`               | `pgsql`              | PostgreSQL only — pgvector is required  |
| `DB_HOST` / `DB_PORT`         | `127.0.0.1` / `5432` |                                         |
| `DB_DATABASE`                 | `agen_gemma`         | The `vector` extension must exist on it |
| `DB_USERNAME` / `DB_PASSWORD` | —                    |                                         |

### Queue, cache, session

| Variable                                       | Default                       | Purpose                                                                                   |
| ---------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| `QUEUE_CONNECTION`                             | `redis`                       | Valkey-backed. The `ai` queue carries inference jobs                                      |
| `CACHE_STORE`                                  | `redis`                       | Valkey-backed cache                                                                       |
| `SESSION_DRIVER`                               | `database`                    |                                                                                           |
| `REDIS_CLIENT`                                 | `phpredis`                    |                                                                                           |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `127.0.0.1` / `6379` / `null` | Valkey is Redis-compatible; the `REDIS_*` names are deliberate and must not be renamed    |
| `REDIS_QUEUE_RETRY_AFTER`                      | `90` (`360` in Compose)       | Must exceed the longest job timeout (`AnalyseCough` = 300s) or running jobs get re-queued |

### Broadcasting (Reverb)

| Variable                                                 | Purpose                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `BROADCAST_CONNECTION=reverb`                            | Required for realtime cough results                                                                     |
| `REVERB_APP_ID` / `REVERB_APP_KEY` / `REVERB_APP_SECRET` | Server credentials                                                                                      |
| `REVERB_HOST` / `REVERB_PORT` / `REVERB_SCHEME`          | What the browser connects to                                                                            |
| `REVERB_SERVER_HOST` / `REVERB_SERVER_PORT`              | What the Reverb process binds to                                                                        |
| `VITE_REVERB_*`                                          | Mirrors of the above, **inlined at build time** — a hostname change needs a rebuild, not just a restart |

### AI service boundary

| Variable             | Default                 | Purpose                                    |
| -------------------- | ----------------------- | ------------------------------------------ |
| `AI_SERVICE_URL`     | `http://127.0.0.1:9000` | Base URL of the Python service             |
| `AI_SERVICE_TOKEN`   | —                       | Shared secret; must equal the Python side  |
| `AI_SERVICE_TIMEOUT` | `300`                   | Seconds. Cold model loads are slow         |
| `AI_SERVICE_RETRIES` | `2`                     | HTTP-level retries inside `PythonAiClient` |

### Gemini Live (interaction only)

| Variable           | Default                                | Purpose                                                                                         |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`   | —                                      | Without it, `GET /live/token` returns `503 gemini_not_configured` and the UI falls back to text |
| `AI_LIVE_MODEL`    | `models/gemini-3.1-flash-live-preview` | Live API model                                                                                  |
| `AI_LIVE_LANGUAGE` | `en-US`                                | Speech language                                                                                 |

No clinical data is sent to Gemini. See [SECURITY.md](SECURITY.md).

## Python service (`ai-service/.env`)

| Variable               | Default                              | Purpose                                                                                                     |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `AI_SERVICE_TOKEN`     | —                                    | Must match Laravel; enforced in `app/security.py`                                                           |
| `AI_DEVICE`            | `auto`                               | `auto`, `cpu`, or `cuda`                                                                                    |
| `PRELOAD_MODELS`       | `hear,classifier,embeddings`         | Adapters loaded at startup; add `gate` to preload the cough gate. Empty means lazy loading on first request |
| `MODEL_DIR`            | —                                    | Weight cache directory. Empty uses the default Hugging Face cache                                           |
| `HF_TOKEN`             | —                                    | Needed only to _download_ gated weights                                                                     |
| `HEAR_MODEL`           | `google/hear-pytorch`                | Health acoustic embedding model                                                                             |
| `TB_CLASSIFIER_MODEL`  | `sach3v/Domain_aware_dual_head_HEar` | TB dual-head classifier over HeAR embeddings                                                                |
| `EMBEDDING_MODEL`      | `google/embeddinggemma-300m`         | Text embeddings                                                                                             |
| `COUGH_GATE_MODEL`     | `models/cough_gate.joblib`           | Personal cough-vs-other gate; see [AI-PIPELINE.md](AI-PIPELINE.md)                                          |
| `COUGH_GATE_THRESHOLD` | `0.5`                                | Probability of "cough" below which a sample is rejected as `unclear`                                        |
| `MAX_UPLOAD_MB`        | `25`                                 | Upload ceiling for audio                                                                                    |

### Vertex AI (optional)

| Variable                         | Default          | Purpose                                                                                                                                  |
| -------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `VERTEX_PROJECT`                 | —                | GCP project id                                                                                                                           |
| `VERTEX_LOCATION`                | `us-central1`    | Endpoint region                                                                                                                          |
| `VERTEX_ENDPOINT_ID`             | —                | **The switch.** Empty ⇒ fake mode, template briefings, `vertex.mode: "fake"`                                                             |
| `VERTEX_MEDGEMMA_MODEL`          | `medgemma-4b-it` | Reported in health and briefing metadata                                                                                                 |
| `VERTEX_TIMEOUT_S`               | `60`             | Per-call timeout                                                                                                                         |
| `GOOGLE_APPLICATION_CREDENTIALS` | —                | Service-account key path. Leave unset to use ADC or workload identity. An empty string breaks ADC, so it is passed through only when set |

`vertex_configured` is true only when both `VERTEX_PROJECT` and
`VERTEX_ENDPOINT_ID` are set (`ai-service/app/config.py`).

## Production (`.env.production`)

The Compose stack reads one file for both services. Beyond the variables above:

| Variable                  | Purpose                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `APP_DOMAIN`              | Public hostname. Caddy requests a Let's Encrypt certificate for it, and it is baked into the frontend bundle as `VITE_REVERB_HOST` |
| `ACME_EMAIL`              | Let's Encrypt registration address                                                                                                 |
| `APP_VERSION`             | Image tag. Bump per release so rollback is possible                                                                                |
| `VERTEX_CREDENTIALS_FILE` | Host path to a service-account key, mounted read-only at `/run/secrets/vertex-sa.json`                                             |
| `MAIL_*`                  | Verification and password-reset delivery. `MAIL_MAILER=resend` sends through Resend; `log` writes to stderr instead of sending     |
| `RESEND_API_KEY`          | Resend API key, read when `MAIL_MAILER=resend`. `MAIL_FROM_ADDRESS` must be on a domain verified in Resend                         |

Compose fails fast on missing required values — entries use the
`${VAR:?message}` form, so a missing `DB_PASSWORD` stops the run with a message
rather than starting a half-configured stack.

Generate secrets with `openssl rand -hex 32` and keep `.env.production` at mode
`600`. It is gitignored.

## Rate limiters

Defined in `app/Providers/AppServiceProvider.php`, applied per authenticated
user:

| Limiter           | Limit  | Applied to                  |
| ----------------- | ------ | --------------------------- |
| `consult-voice`   | 20/min | `POST /consult/{id}/voice`  |
| `consult-chat`    | 30/min | `POST /consult/{id}/chat`   |
| `consult-cough`   | 10/min | `POST /consult/{id}/cough`  |
| `consult-context` | 8/min  | `GET /consult/{id}/context` |
