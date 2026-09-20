---
paths:
  - package.json
  - docker-compose.yml
  - composer.json
---

# General

## Bun is the package manager

Project uses bun (bun.lock committed). Use `bun install`, `bun run build`, `bun run dev`. composer.json setup/ci:check scripts call bun, not npm.

## Prod compose traps: build-time VITE_REVERB_*, queue retry_after, unset Google creds

docker-compose.yml is the prod stack (Caddy web -> php-fpm app, reverb, queue, migrate, ai-service, pgvector db, Valkey). Run it with `docker compose --env-file .env.production ...`; `.env.production` is gitignored, `.env.production.example` is the template.

- VITE_REVERB_* (and VITE_APP_NAME) are inlined by Vite at image build time from compose build args (APP_DOMAIN, REVERB_APP_KEY). Changing the domain or Reverb key needs `--build`, not just a restart. Server-side pushes use REVERB_HOST=reverb:8080 over the internal network.
- REDIS_QUEUE_RETRY_AFTER must stay above the longest job timeout (AnalyseCough = 300s), otherwise running jobs get re-queued. The queue worker must listen on `ai,default` or cough analysis never runs.
- ai-service must never receive an empty GOOGLE_APPLICATION_CREDENTIALS (google-auth treats empty as a file path and breaks ADC); it is passed through unset on purpose.
- reverb depends on redis being healthy (it polls the cache); bootstrap/app.php trusts proxies so AuditLogger records the real client IP behind Caddy.
- Model weights are not baked into images: run `docker compose --env-file .env.production --profile setup run --rm ai-models`, then restart ai-service (it runs HF_HUB_OFFLINE=1).

## composer test runs Pest via the @pest script
`composer test` = Pint + PHPStan + Pest, and `composer ci:check` just calls it. The Pest step is the separate `@pest` script, which sets `DB_CONNECTION=pgsql` before `php artisan test --compact` because phpunit.xml pins the sqlite driver with `DB_DATABASE=":memory:"` (a real Postgres database name here).

Before 2026-09-20 the `test` script stopped after PHPStan, so CI never ran a PHP test. Do not drop `@pest` from it again.
