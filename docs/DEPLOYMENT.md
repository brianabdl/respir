# Deployment

The production target is a single Docker host — a clinic box or a small VM. The
Compose stack builds two images (the Laravel app and the Python service) and
runs seven containers plus two one-shot jobs.

For development setup, see [INSTALLATION.md](INSTALLATION.md).

## Stack

| Service      | Image                                 | Role                                                                | Published            |
| ------------ | ------------------------------------- | ------------------------------------------------------------------- | -------------------- |
| `web`        | `caddy:2-alpine` (build target `web`) | TLS termination, static files, PHP-FastCGI proxy, `/app/*` → Reverb | **80, 443, 443/udp** |
| `app`        | `respir-app` (target `app`)           | PHP-FPM                                                             | no                   |
| `queue`      | same image                            | `queue:work redis --queue=ai,default`                               | no                   |
| `reverb`     | same image                            | `reverb:start` on 8080                                              | no                   |
| `ai-service` | `respir-ai-service`                   | FastAPI clinical inference                                          | no                   |
| `db`         | `pgvector/pgvector:pg16`              | PostgreSQL + pgvector                                               | no                   |
| `redis`      | `valkey/valkey:9-alpine`              | Queues, cache, sessions                                             | no                   |
| `migrate`    | app image                             | One-shot `migrate --force` before `app` starts                      | —                    |
| `ai-models`  | ai-service image                      | One-shot weight download (`--profile setup`)                        | —                    |

Only `web` is reachable from outside. Everything clinical sits on the internal
`backend` network.

## First deployment

```bash
git clone https://github.com/brianabdl/agentic-med-gemma.git respir
cd respir

cp .env.production.example .env.production
chmod 600 .env.production
```

Fill in `.env.production`. Required, and Compose refuses to start without them:

```dotenv
APP_KEY=              # php artisan key:generate --show
APP_DOMAIN=           # DNS must already point here
ACME_EMAIL=
DB_PASSWORD=          # openssl rand -hex 32
REDIS_PASSWORD=
AI_SERVICE_TOKEN=
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
```

Bring it up:

```bash
docker compose --env-file .env.production up -d --build
```

`migrate` runs to completion before `app` starts, so the first boot is already
migrated.

Then download the model weights into the shared `ai_models` volume (needs
`HF_TOKEN` with access to the gated HeAR repository):

```bash
docker compose --env-file .env.production --profile setup run --rm ai-models
docker compose --env-file .env.production restart ai-service
```

Without this step the stack runs fine and every cough comes back `unclear`.

Verify:

```bash
docker compose --env-file .env.production ps
curl -sI https://$APP_DOMAIN | head -1
docker compose --env-file .env.production exec ai-service \
  python -c "import os,urllib.request as u; \
  print(u.urlopen(u.Request('http://127.0.0.1:9000/v1/health', \
  headers={'X-Internal-Token': os.environ['AI_SERVICE_TOKEN']})).read().decode())"
```

## Build-time versus runtime configuration

Vite inlines `VITE_*` values into the JavaScript bundle at **build** time. A
change to `APP_DOMAIN`, `REVERB_APP_KEY`, or `APP_NAME` therefore needs a
rebuild, not a restart:

```bash
docker compose --env-file .env.production up -d --build
```

Symptom of getting this wrong: the page loads, but the WebSocket tries to reach
the old hostname and cough results never arrive.

## TLS

Caddy requests and renews Let's Encrypt certificates for `APP_DOMAIN`
automatically. DNS must resolve to the host and ports 80/443 must be reachable
before the first start, or the ACME challenge fails.

The `Caddyfile` also sets HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, immutable caching for `/build/*`, a 404 for dotfile paths, and
a 64 MB request body cap (camera captures are allowed up to 50 MB).

### Behind an existing proxy or tunnel

If the host already terminates TLS — a reverse proxy, or a Cloudflare tunnel —
run Caddy on plain HTTP with `auto_https off`, set `trusted_proxies`, and bind
the published port to loopback. Keep that overlay out of the repository as a
local `docker-compose.override.yml`, since it is site-specific.

Trusted-proxy configuration decides whether `X-Forwarded-*` is believed, which
affects signed URLs and IP-based rate limits. See
`tests/Feature/Security/TrustedProxyTest.php`.

## Vertex AI (optional)

No code change is needed. Deploy MedGemma from Vertex AI Model Garden, then set:

```dotenv
VERTEX_PROJECT=your-project
VERTEX_LOCATION=us-central1
VERTEX_ENDPOINT_ID=123456789
```

Authentication is either workload identity / ADC on GCP, or a service-account
key mounted read-only:

```dotenv
VERTEX_CREDENTIALS_FILE=./secrets/vertex-sa.json
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/vertex-sa.json
```

Restart `ai-service` and confirm `/v1/health` reports `vertex.mode: "endpoint"`.
Until then the service stays in fake mode and briefings are marked
`degraded: true`.

## Operations

### Logs

```bash
docker compose --env-file .env.production logs -f app queue ai-service
```

All services use `json-file` logging capped at 10 MB × 3 files.

### Queue worker

`queue:work` handles SIGTERM by finishing the current job, so the container gets
a 330-second grace period against the 300-second job timeout. `--max-time=3600`
recycles the worker hourly to bound memory growth.

`REDIS_QUEUE_RETRY_AFTER` is 360 in Compose, which must stay above the longest
job timeout (`AnalyseCough` = 300s). Lower it and a still-running analysis gets
re-queued and runs twice.

### Backups

State lives in named volumes: `postgres_data`, `redis_data`, `app_storage`
(patient captures), `ai_models`, `caddy_data`.

```bash
docker compose --env-file .env.production exec db \
  pg_dump -U "$DB_USERNAME" "$DB_DATABASE" | gzip > backup-$(date +%F).sql.gz
```

`app_storage` holds patient media — back it up with the same care as the
database, and encrypt the backups.

### Upgrades and rollback

```bash
git pull
APP_VERSION=2026.09.21 docker compose --env-file .env.production up -d --build
```

Tag each release with `APP_VERSION` so a rollback is a redeploy of the previous
tag rather than a rebuild of unknown code.

### Resource notes

- The `ai-service` image with the CPU torch build is roughly 3.5 GB; model
  weights add about 2.4 GB in the `ai_models` volume.
- Building it needs several GB of free space for the Docker build cache.
  `docker builder prune -af` afterwards.
- CPU inference works; `AI_DEVICE=cuda` with a GPU runtime is faster but not
  required.
- `ai-service` uses a 180-second healthcheck start period because the first
  model load is slow.

## Health checks

| Target       | Check                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| Laravel      | `GET /up` (internal listener on `:8081` for the container healthcheck) |
| `ai-service` | `GET /v1/health` with `X-Internal-Token`                               |
| PostgreSQL   | `pg_isready`                                                           |
| Valkey       | `valkey-cli ping`                                                      |
| Reverb       | TCP connect on 8080                                                    |

A `degraded` AI service is a normal state without weights or Vertex, not an
outage. Distinguish the two by reading `models.*.loaded` and `vertex.mode`.
