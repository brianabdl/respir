# Testing

Two suites: Pest for the Laravel application, pytest for the Python service.
Both run in CI on every push and pull request.

## Quick reference

```bash
# PHP — full gate: Pint + PHPStan + Pest
composer test

# PHP — tests only
composer pest
DB_CONNECTION=pgsql php artisan test --compact
DB_CONNECTION=pgsql php artisan test --compact tests/Feature/Consult
DB_CONNECTION=pgsql php artisan test --compact --filter=records_consent

# Python
cd ai-service
uv run pytest
uv run ruff check .

# Frontend
bun run types:check
bun run check          # vp check — warnings are failures
bun run check:fix      # format
```

Current state: **129 Pest tests** (5 skipped without a live AI service) and
**43 pytest tests**.

## The database requirement

Pest runs against a **real PostgreSQL database**, not SQLite, because migrations
create the `vector` extension and a vector column.

`phpunit.xml` sets `DB_DATABASE=":memory:"`. Under the `pgsql` driver that string
is just a database name, so a PostgreSQL database literally called `:memory:`
must exist with the `vector` extension:

```bash
sudo -u postgres createdb ':memory:'
sudo -u postgres psql -d ':memory:' -c 'CREATE EXTENSION IF NOT EXISTS vector;'
```

`composer pest` sets `DB_CONNECTION=pgsql` for you. Running
`php artisan test` without it falls back to SQLite and fails on the first
migration.

## What the PHP suite covers

### Consultation flow — `tests/Feature/Consult/`

| Test | Covers |
| --- | --- |
| `ConsultationFlowTest` | Start a consultation, record consent, the 403s when consent is missing, transcript persistence |
| `AnalyseCoughJobTest` | The `ai` queue job: persistence, embedding upsert, aggregation, broadcast — including the failure path that still broadcasts `unclear` |
| `GenerateClinicianBriefingJobTest` | Briefing generation, de-identified payload, `degraded` fallback |
| `PythonAiClientTest` | HTTP client behavior against a faked service: retries, timeouts, error envelopes |
| `AiServiceIntegrationTest` | Live contract test — skipped unless `AI_SERVICE_INTEGRATION=1` |

### Security — `tests/Feature/Security/`

| Test | Covers |
| --- | --- |
| `AuditLogTest` | Actions are recorded, and audit context carries no clinical content |
| `CaptureDownloadTest` | Signed URLs, expiry, owner-or-doctor authorization |
| `RateLimitTest` | `consult-voice`, `consult-chat`, `consult-cough` limits |
| `TrustedProxyTest` | `X-Forwarded-*` handling behind a proxy |

### Doctor console — `tests/Feature/Doctor/`

`ReviewConsoleTest` covers the triage queue, filters, and access control.
`BriefingAndSimilarityTest` covers briefing dispatch and pgvector similarity
results.

### Realtime — `tests/Feature/RealtimeChannelAuthorizationTest.php`

Asserts that `consultation.{id}` authorizes the owning patient and doctors, and
rejects everyone else. A private channel that authorizes everyone leaks silently,
so this one matters more than its size suggests.

### Auth, onboarding, settings

`tests/Feature/Auth/*` (Fortify flows), `Onboarding/CompleteProfileTest`,
`Settings/*`, `DashboardTest`, `ConversationContextTest`.

## What the Python suite covers

`ai-service/tests/`:

| Test | Covers |
| --- | --- |
| `test_health.py` | Health payload, adapter states, Vertex mode reporting |
| `test_cough.py` | `/v1/cough/analyze` happy path and degraded paths |
| `test_cough_gate.py` | Gate accept/reject and the untrained-gate skip |
| `test_audio.py` | ffmpeg decode, audibility floor, burst detection |
| `test_hear_preprocess.py` | The HeAR front end against reference values |
| `test_tb_classifier.py` | Score-to-band mapping at the 0.55 / 0.66 cutoffs |
| `test_briefing.py` | Briefing structure, repair path, template fallback |
| `test_pseudonymization.py` | `extra="forbid"` rejection and identifier redaction |
| `test_embeddings.py` | Audio and text embedding endpoints |

`tests/stubs.py` replaces the heavy models, so the suite runs in seconds without
weights, without a GPU, and without Vertex.

## Live contract test

Pins the HTTP contract between Laravel and the Python service against a real
running instance:

```bash
# Terminal 1
cd ai-service && uv run uvicorn app.main:app --host 127.0.0.1 --port 9000

# Terminal 2
AI_SERVICE_INTEGRATION=1 DB_CONNECTION=pgsql \
  php artisan test tests/Feature/Consult/AiServiceIntegrationTest.php
```

It is skipped by default, which is why the suite reports skipped tests on a
normal run.

## Static analysis and style

```bash
vendor/bin/pint --dirty --format agent      # format changed files
composer lint:check                          # Pint in test mode
composer types:check                         # PHPStan (Larastan)
```

PHPStan needs `--memory-limit=1G`; the bare `vendor/bin/phpstan analyse` dies at
the 128 MB worker limit. `composer types:check` already passes the flag.

Python style is `ruff`: `uv run ruff check .`.

## Frontend checks

```bash
bun run types:check    # tsc
bun run check          # vp check — warnings fail
bun run check:fix      # format and autofix
```

After changing routes, regenerate the Wayfinder helpers and re-format:

```bash
php artisan wayfinder:generate --with-form
bun run check:fix
```

`--with-form` is required. The plain command deletes the `.form` variants and
breaks the auth and settings pages.

## Continuous integration

| Workflow | Trigger | Runs |
| --- | --- | --- |
| `.github/workflows/tests.yml` | push to `master`/`main`, all PRs | PostgreSQL 16 + pgvector service, creates the `:memory:` database, builds the frontend, then `composer ci:check` (Pint → PHPStan → Pest) |
| `.github/workflows/ai-service.yml` | changes under `ai-service/` | `ruff check` and `pytest` with ffmpeg installed |

## Writing tests

- Feature tests over unit tests; use factories and their states.
- Any endpoint behind the consent gate needs
  `Consultation::factory()->create(['consented_at' => now()])`.
- Jobs belong to the `ai` queue via `$this->onQueue('ai')` in the constructor.
  Never add a typed `public string $queue` property — `Illuminate\Bus\Queueable`
  declares an untyped `$queue` and PHP fatals on the conflict.
- Create tests with `php artisan make:test --pest SomeFeatureTest` (no directory
  prefix in the name).
- Test the changed behavior and its important failure modes. Do not delete
  existing tests to make a change pass.
