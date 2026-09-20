# Installation

Two supported paths:

- **[Native](#native-setup)** — best for development. You run PostgreSQL,
  Valkey, PHP, and Python yourself.
- **[Docker](#docker-setup)** — one command brings up the whole stack. Best for
  a demo machine or a clinic box.

Respir runs without a Google Cloud account and without the gated model weights.
In that mode cough analysis returns `unclear` and briefings come from a
template. Everything else — consent, the voice interview, the doctor console,
the audit log — works.

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| PHP | 8.5 | with `pdo_pgsql`, `redis`, `pcntl` |
| Composer | 2.x | |
| Bun | 1.4+ | frontend build (Vite 8) |
| PostgreSQL | 18 | with the `pgvector` extension available |
| Valkey | 9+ | or Redis; the `redis` driver name is intentional |
| Python | 3.12 | managed by [uv](https://docs.astral.sh/uv/) |
| ffmpeg | any recent | must be on `PATH`; used to decode uploads to 16 kHz mono |
| Docker | 24+ | only for the Docker path |

Optional but needed for full clinical behavior:

- **Gemini API key** — realtime voice interview. Without it the text fallback is
  used instead.
- **Hugging Face token with access to gated models** — HeAR weights.
- **Google Cloud project with a MedGemma Model Garden endpoint** — real
  briefings instead of templates.

## Native setup

### 1. Clone and install

```bash
git clone https://github.com/brianabdl/agentic-med-gemma.git respir
cd respir

composer install
bun install
cp .env.example .env
php artisan key:generate
```

### 2. Create the database and the pgvector extension

The extension must be created by a superuser, once per database. Respir uses
pgvector for acoustic similarity search, so this step is not optional.

```bash
sudo -u postgres createdb agen_gemma
sudo -u postgres psql -d agen_gemma -c 'CREATE EXTENSION IF NOT EXISTS vector;'
```

The Pest suite runs against a real PostgreSQL database that is literally named
`:memory:` (it is a name, not SQLite). Create it too, or the test suite fails at
the first migration:

```bash
sudo -u postgres createdb ':memory:'
sudo -u postgres psql -d ':memory:' -c 'CREATE EXTENSION IF NOT EXISTS vector;'
```

Point `DB_USERNAME` / `DB_PASSWORD` in `.env` at a role that can reach both.

### 3. Migrate and build

```bash
php artisan migrate
bun run build
```

### 4. Configure the environment

At minimum set `AI_SERVICE_TOKEN` to a random string — it is the shared secret
between Laravel and the Python service, and it must match on both sides.

```bash
php -r 'echo bin2hex(random_bytes(24)), PHP_EOL;'   # use the output below
```

```dotenv
AI_SERVICE_URL=http://127.0.0.1:9000
AI_SERVICE_TOKEN=<the value you just generated>

GEMINI_API_KEY=<optional; enables the realtime voice interview>

REVERB_APP_ID=respir
REVERB_APP_KEY=local-key
REVERB_APP_SECRET=local-secret
```

Full variable reference: [CONFIGURATION.md](CONFIGURATION.md).

### 5. Set up the Python AI service

```bash
cd ai-service
cp .env.example .env         # set AI_SERVICE_TOKEN to the same value as the root .env

uv sync                      # API only — no ML, useful for a quick first run
uv sync --extra ml           # + torch, transformers, HeAR, TB classifier, embeddings
uv sync --extra vertex       # + google-cloud-aiplatform
```

Download the local weights (requires a Hugging Face token with access to the
gated HeAR repository):

```bash
HF_TOKEN=hf_... uv run scripts/download_models.py
```

Skipping this step is fine for a first run: the service starts, reports
`degraded` on `/v1/health`, and returns `unclear` for every cough.

### 6. Run it

Two terminals:

```bash
# Terminal 1 — Laravel: serve, Vite, Reverb, pail, and the ai + default queue workers
composer run dev

# Terminal 2 — Python AI service
cd ai-service && uv run uvicorn app.main:app --host 127.0.0.1 --port 9000
```

`composer run dev` already registers a queue listener for `--queue=ai,default`.
Do not start a second default-only listener; jobs would be picked up twice.

### 7. Verify

```bash
curl -s http://127.0.0.1:8000/up                                    # Laravel health
curl -s -H "X-Internal-Token: $AI_SERVICE_TOKEN" \
     http://127.0.0.1:9000/v1/health | jq                           # AI service health
valkey-cli ping                                                      # PONG
```

A healthy no-weights, no-Vertex install reports:

```json
{
  "status": "degraded",
  "device": "cpu",
  "models": { "hear": { "loaded": false }, "classifier": { "loaded": false } },
  "vertex": { "configured": false, "mode": "fake", "model": "medgemma-4b-it" }
}
```

That is the expected state without the optional pieces, not a broken install.

### 8. Create a doctor account

Register through the UI, then promote the account:

```bash
php artisan tinker --execute 'App\Models\User::where("email", "doctor@example.test")->update(["role" => "doctor"]);'
```

Patients land on `/consult`; doctors land on the review console at
`/doctor/consultations`.

## Docker setup

The Compose stack runs six services: `web` (Caddy), `app` (PHP-FPM), `queue`,
`reverb`, `ai-service`, `db` (pgvector), and `redis` (Valkey), plus two one-shot
jobs (`migrate`, `ai-models`).

```bash
cp .env.production.example .env.production
# edit: APP_KEY, APP_DOMAIN, ACME_EMAIL, DB_PASSWORD, REDIS_PASSWORD,
#       REVERB_APP_ID/KEY/SECRET, AI_SERVICE_TOKEN, GEMINI_API_KEY

docker compose --env-file .env.production up -d --build
```

Download the model weights into the shared volume once (needs `HF_TOKEN` in
`.env.production`):

```bash
docker compose --env-file .env.production --profile setup run --rm ai-models
docker compose --env-file .env.production restart ai-service
```

Only `web` publishes ports. `db`, `redis`, `ai-service`, and the PHP containers
stay on the internal network.

Operational detail — TLS, tunnels, backups, upgrades — is in
[DEPLOYMENT.md](DEPLOYMENT.md).

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `SQLSTATE... type "vector" does not exist` | The `vector` extension was not created on that database. Run the `CREATE EXTENSION` step as a superuser — including for the test database named `:memory:`. |
| Tests fail immediately with a connection error | Pest needs PostgreSQL, not SQLite. Run `DB_CONNECTION=pgsql php artisan test --compact`. |
| `Unable to locate file in Vite manifest` | Front-end assets were never built. Run `bun run build`, or `composer run dev` while developing. |
| Cough analysis always returns `unclear` | Expected without weights. Check `/v1/health`: if `models.hear.loaded` is `false`, run `scripts/download_models.py`. |
| Non-cough audio gets a risk score | The personal cough gate is not trained. See the gate section in [AI-PIPELINE.md](AI-PIPELINE.md). |
| `401` from the Python service | `AI_SERVICE_TOKEN` differs between the root `.env` and `ai-service/.env`. |
| `503 gemini_not_configured` on `/live/token` | `GEMINI_API_KEY` is unset. The text fallback still works. |
| Cough result never reaches the browser | The `ai` queue has no worker, or Reverb is down. `composer run dev` starts both. |
| PHPStan dies with an out-of-memory error | Run it as `phpstan analyse --memory-limit=1G` (what `composer types:check` does). |
| `php artisan wayfinder:generate` breaks auth pages | This project generates with form variants: `php artisan wayfinder:generate --with-form`, then `bun run check:fix`. |
