# Security and Privacy

Respir handles voice recordings, cough audio, camera frames, and clinical
conversations. The design assumption is that this data must stay under the
clinic's control, and that anything leaving the building must be defensible to a
patient, an ethics committee, and a regulator.

## Threat model in one paragraph

The realistic risks are: a patient's identity being attached to clinical data at
a third-party model provider; audio or video being downloadable by someone other
than the patient or their clinician; a compromised browser session driving the
clinical endpoints; and a data access that nobody can account for afterwards.
Each of the controls below maps to one of those.

## Consent gate

`consultations.consented_at` must be set before any capture endpoint works.
Enforced server-side in `ConsultationController`:

```php
abort_unless($consultation->consented_at !== null, 403,
    'Consent is required before recording a cough.');
```

Gated endpoints: `POST /voice`, `POST /cough`, `GET /live/token`,
`GET /context`. A UI that forgot to show the consent step would fail closed with
403s, not proceed silently.

Consent is recorded in the audit log with its timestamp. It is idempotent — a
second call keeps the original timestamp, so consent cannot be quietly refreshed
to look newer than it is.

Tests that touch these endpoints must create consultations with
`['consented_at' => now()]`, which is a reminder that the gate is real.

## De-identification

Two independent layers, on purpose — one of them being wrong should not be
enough to leak.

**Layer 1 — Laravel.** `BriefingPayloadBuilder` replaces the patient's name with
a subject token and strips emails before a payload is constructed. Age and sex
are derived values, not record copies.

**Layer 2 — Python.** `BriefingRequest` is a Pydantic model with
`extra="forbid"`. Any field outside `subject_token`, `age`, `sex`,
`risk_factors`, `transcript`, `cough` is a **422**. A regression that started
sending `name` would break loudly in CI rather than ship quietly.

**Layer 3 — outbound text.** `redact_identifiers()` replaces emails and phone
numbers inside free text before it reaches Vertex.

What actually leaves the host:

| Destination | Receives | Never receives |
| --- | --- | --- |
| Gemini Live | Live speech audio and the system instruction for the interview | Cough audio, risk scores, briefings, stored records |
| Vertex MedGemma | De-identified transcript turns, age, sex, risk factors, cough band and score | Names, emails, phone numbers, patient ids, raw audio |

Cough audio and its embeddings never leave the clinic host at all. Embeddings are
derived acoustic features and cannot be replayed as a recording.

## Audit log

`AuditLogger::record()` writes an append-only `audit_logs` row for every
patient-data access and every external AI call: actor, action, subject,
destination, small JSONB context, IP, and user agent.

The rule is that **audit context never contains clinical content** — counts,
ids, bands, and flags only. `tests/Feature/Security/AuditLogTest.php` asserts it.

Covered actions:

```
consultation.list_viewed   consultation.viewed      consultation.updated
consultation.reviewed      consultation.consent_recorded
consultation.live_session_started                   consultation.context_retrieved
capture.downloaded         cough.analysed
briefing.requested         briefing.generated
```

Doctor access to a patient record is therefore reconstructable after the fact,
which is the property an ethics review asks for.

## Authentication and authorization

- Laravel Fortify handles login, registration, password reset, and email
  verification. All application routes require `auth` and `verified`.
- `EnsurePatient` and `EnsureDoctor` separate the two flows by `users.role`.
- `EnsureProfileCompleted` blocks the consult flow until onboarding and privacy
  policy acceptance are done.
- Consultations are authorized per request — a patient reaches only their own,
  a doctor reaches the review console.
- Broadcast authorization lives in `routes/channels.php`: `consultation.{id}` is
  readable by the owning patient or any doctor.
  `tests/Feature/RealtimeChannelAuthorizationTest.php` covers it, because a
  private channel that authorizes everyone is a silent data leak.

## Media downloads

Captures sit on the `local` disk, outside the public directory. There is no URL
that serves them statically.

`GET /consult/{consultation}/captures/{capture}/download`:

- lives outside `EnsurePatient`, because doctors need it;
- is protected by Laravel's `signed` middleware — the URL carries a signature and
  a 30-minute expiry;
- is authorized owner-or-doctor inside the controller, so a leaked signed URL is
  still useless to a third party;
- is audited on every use.

`tests/Feature/Security/CaptureDownloadTest.php` covers the unsigned, expired,
and wrong-user cases.

## Gemini Live tokens

The browser never holds `GEMINI_API_KEY`. `GET /live/token` exchanges it
server-side for an ephemeral token: **single use**, 30-minute expiry, one minute
to open the session. Starting a live session is audited with
`destination: gemini`.

Audio streams browser → Google directly. That keeps latency usable and means the
Laravel server is not a relay for raw patient speech.

## Service-to-service authentication

Every `ai-service` endpoint requires `X-Internal-Token` (`ai-service/app/security.py`),
matched against `AI_SERVICE_TOKEN`. In the Compose stack the service has no
published port and is reachable only on the internal network. It should never be
exposed to the internet: the token is an internal boundary, not a public API key.

## Rate limiting

Per authenticated user, defined in `AppServiceProvider`:

| Limiter | Limit | Endpoint |
| --- | --- | --- |
| `consult-voice` | 20/min | `POST /consult/{id}/voice` |
| `consult-chat` | 30/min | `POST /consult/{id}/chat` |
| `consult-cough` | 10/min | `POST /consult/{id}/cough` |
| `consult-context` | 8/min | `GET /consult/{id}/context` |

These bound both abuse and cost — each one fronts a paid or compute-heavy path.
`tests/Feature/Security/RateLimitTest.php` covers them.

## Transport and proxies

In production Caddy terminates TLS with automatic Let's Encrypt certificates and
serves HTTP/3. `SESSION_SECURE_COOKIE` is on and `APP_DEBUG` is off.

Behind a reverse proxy or a tunnel, trusted-proxy configuration decides whether
`X-Forwarded-*` headers are believed. Getting this wrong turns signed URLs and
rate limits by IP into nonsense, so it is covered by
`tests/Feature/Security/TrustedProxyTest.php`.

## Secrets

- `.env`, `.env.production`, and `ai-service/.env` are gitignored. Only
  `*.example` templates are committed.
- `.env.production` should be mode `600`; generate values with
  `openssl rand -hex 32`.
- Vertex credentials are either ADC/workload identity or a service-account key
  mounted read-only at `/run/secrets/vertex-sa.json`.
- `models/cough_gate.joblib` is gitignored — it encodes personal voice
  characteristics.

If a secret is ever committed, rotate it; removing the file does not remove it
from git history.

## Known limitations

Stated plainly, because a security section that claims completeness is not
credible:

- **No automatic media retention policy.** Captures persist until deleted. A
  real deployment needs a scheduled purge.
- **No database-level encryption at rest** is configured by default; that is left
  to the host or volume layer.
- **No two-factor authentication** for doctor accounts yet.
- **Thresholds are not clinically validated.** See the clinical status note in
  [AI-PIPELINE.md](AI-PIPELINE.md).
- **Gemini Live processes patient speech** under Google's terms. That is the one
  deliberate off-host data flow, and it is the reason clinical reasoning was kept
  out of it.

## Reporting a vulnerability

Open a GitHub issue for non-sensitive reports. For anything that exposes patient
data, contact the maintainers privately first rather than filing publicly.
