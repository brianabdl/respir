# API Reference

Three surfaces:

1. **[Laravel HTTP](#laravel-http-api)** — the browser talks to this. Session
   cookie auth, CSRF, Inertia or JSON.
2. **[Reverb WebSocket events](#websocket-events)** — the server pushes results
   here. No polling anywhere in the app.
3. **[Python AI service](#python-ai-service)** — internal only, token
   authenticated, never exposed to the internet.

## Laravel HTTP API

All routes require an authenticated, email-verified session.
`EnsurePatient` guards the patient flow, `EnsureDoctor` the review console, and
`EnsureProfileCompleted` sends incomplete profiles to onboarding.

**Consent gate.** Voice, cough, live-token, and context endpoints abort with
**403** unless `consultations.consented_at` is set. This is server-side; hiding
a button in the UI is not the control.

### Patient — consultation

| Method | Path                                                  | Name                        | Notes                                   |
| ------ | ----------------------------------------------------- | --------------------------- | --------------------------------------- |
| `GET`  | `/consult`                                            | `consult`                   | Inertia page: consult room              |
| `POST` | `/consult`                                            | `consult.store`             | Creates a consultation, redirects to it |
| `POST` | `/consult/{consultation}/consent`                     | `consult.consent`           | Records consent                         |
| `POST` | `/consult/{consultation}/chat`                        | `consult.chat`              | SSE stream; 30/min                      |
| `POST` | `/consult/{consultation}/voice`                       | `consult.voice`             | Text or audio turn; 20/min              |
| `GET`  | `/consult/{consultation}/live/token`                  | `consult.live.token`        | Ephemeral Gemini Live token             |
| `GET`  | `/consult/{consultation}/context`                     | `consult.context`           | Recall prior turns; 8/min               |
| `POST` | `/consult/{consultation}/sessions`                    | `consult.sessions.log`      | Persist a session transcript            |
| `POST` | `/consult/{consultation}/cough`                       | `consult.cough`             | Upload a cough sample; 10/min           |
| `POST` | `/consult/{consultation}/captures`                    | `consult.captures.store`    | Upload camera media                     |
| `GET`  | `/consult/{consultation}/captures/{capture}/download` | `consult.captures.download` | Signed URL; patient or doctor           |

#### `POST /consult/{consultation}/consent`

No body. Idempotent — a second call keeps the original timestamp.

```json
{ "consented_at": "2026-09-19T13:54:05+00:00" }
```

#### `POST /consult/{consultation}/cough`

`multipart/form-data`, field `audio`. Accepted types: `audio/webm`,
`video/webm` (browser `MediaRecorder` labels audio-only WebM this way),
`audio/ogg`, `audio/mp4`, `audio/mpeg`, `audio/wav`. Max 8 MB.

**202 Accepted**

```json
{ "status": "processing", "capture_id": 42 }
```

The analysis is _not_ in this response. Subscribe to `cough.analysis` on the
consultation channel.

#### `POST /consult/{consultation}/voice`

`multipart/form-data` or JSON. `message` (string, ≤4000) and/or `audio` (≤8 MB),
plus optional `new_session` (bool). Returns a `VoiceTurnResult`: the assistant
turn, the transcript, and any state change.

#### `POST /consult/{consultation}/chat`

JSON `{ "message": "...", "new_session": false }`. Responds with a
`text/event-stream` of agent tokens — the fallback path when Gemini Live is
unavailable.

#### `GET /consult/{consultation}/live/token`

Mints a single-use Gemini Live token (30-minute expiry, 1-minute window to open
the session) so audio goes browser → Google directly.

```json
{
    "token": "auth_tokens/…",
    "model": "models/gemini-3.1-flash-live-preview",
    "language_code": "en-US",
    "system_instruction": "…"
}
```

**503** `{"error":"gemini_not_configured"}` when `GEMINI_API_KEY` is unset, or
`{"error":"token_provision_failed"}` when Google rejects the request.

#### `POST /consult/{consultation}/sessions`

```json
{
    "session_id": "live-1758288845",
    "agent_conversation_id": "01J…",
    "turns": [{ "role": "user", "text": "I have had a cough for three weeks" }],
    "started_at": "2026-09-19T13:55:39+00:00",
    "ended": true
}
```

Up to 600 turns, 2000 characters each. Upsert by `session_id`. **201**
`{"saved": true}`.

#### `GET /consult/{consultation}/context?q=fever`

Returns only patient-stated turns from earlier sessions — never stored clinical
analysis — so a fresh Live session can recall the conversation. Each call is
audited with `destination: gemini`.

#### `POST /consult/{consultation}/captures`

`multipart/form-data`: `type` (`video` or `photo`) and `media`
(`video/webm`, `video/mp4`, `image/png`, `image/jpeg`; max 50 MB). **201** with
the capture id, type, path, and MIME type.

#### `GET /consult/{consultation}/captures/{capture}/download`

Outside `EnsurePatient` (doctors need it), protected by the `signed` middleware
and authorized owner-or-doctor in the controller. Signed URLs last 30 minutes.
Each download is audited.

### Doctor — review console

| Method | Path                                            | Name                            | Notes                                |
| ------ | ----------------------------------------------- | ------------------------------- | ------------------------------------ |
| `GET`  | `/doctor/consultations`                         | `doctor.consultations.index`    | Triage queue with filters and search |
| `GET`  | `/doctor/consultations/{consultation}`          | `doctor.consultations.show`     | Full review page                     |
| `POST` | `/doctor/consultations/{consultation}/briefing` | `doctor.consultations.briefing` | Queues briefing generation           |
| `GET`  | `/doctor/consultations/{consultation}/similar`  | `doctor.consultations.similar`  | Acoustically similar past coughs     |
| `POST` | `/doctor/consultations/{consultation}/notes`    | `doctor.consultations.notes`    | Clinical notes + follow-up actions   |
| `POST` | `/doctor/consultations/{consultation}/review`   | `doctor.consultations.review`   | Mark reviewed                        |
| `GET`  | `/doctor/consultations/{consultation}/export`   | `doctor.consultations.export`   | PDF export                           |

#### `POST /doctor/consultations/{id}/briefing`

**202** `{"status":"processing"}`. `GenerateClinicianBriefing` runs on the `ai`
queue; the result arrives as `consultation.updated`.

#### `GET /doctor/consultations/{id}/similar`

```json
{
    "similar": [
        {
            "consultation_id": 1,
            "patient": "Demo Patient",
            "risk_level": "medium",
            "distance": 0.0102
        }
    ]
}
```

`distance` is pgvector's cosine distance (`embedding <=> ?`) over
`cough_embeddings`, ordered ascending — smaller is more similar. Up to five
results, always from other consultations.

#### `POST /doctor/consultations/{id}/notes`

```json
{
    "clinical_notes": "get medical check up soon",
    "follow_up_actions": ["order_chest_xray", "schedule_follow_up_2_weeks"]
}
```

`clinical_notes` ≤10000 characters. Returns `{"success": true, "message": "…"}`.

#### `POST /doctor/consultations/{id}/review`

Sets `is_reviewed`, `reviewed_at`, `reviewed_by`, and audits
`consultation.reviewed`.

### Other routes

| Method                 | Path                  | Name                                     |
| ---------------------- | --------------------- | ---------------------------------------- |
| `GET`                  | `/`                   | `home`                                   |
| `GET`                  | `/privacy`            | `privacy`                                |
| `GET`                  | `/dashboard`          | `dashboard`                              |
| `GET`/`POST`           | `/onboarding/profile` | `onboarding.profile.edit` / `.update`    |
| `GET`/`PATCH`/`DELETE` | `/settings/profile`   | `profile.*`                              |
| `GET`/`PUT`            | `/settings/security`  | `security.edit` / `user-password.update` |

Auth routes (login, register, password reset, email verification) come from
Laravel Fortify.

### Frontend route calls

The SPA never hardcodes URLs. Wayfinder generates typed helpers imported from
`@/actions/...` and `@/routes/...`. Regenerate after any route change:

```bash
php artisan wayfinder:generate --with-form
bun run check:fix
```

`--with-form` is mandatory here — the plain command strips `.form` variants and
breaks the auth and settings pages.

## WebSocket events

Laravel Reverb, private channel `consultation.{id}`. Authorization lives in
`routes/channels.php`: the consultation owner, or any doctor.

### `cough.analysis`

Broadcast by `CoughAnalysisCompleted` when `AnalyseCough` finishes — including
when it finishes as `unclear`.

```json
{
    "consultation_id": 3,
    "risk_level": "low",
    "cough_risk": "low",
    "cough_analysis": {
        "risk_level": "low",
        "risk_score": 0.55,
        "findings": "Classifier flagged a low acoustic risk pattern over a 1.37-second recording.",
        "recommendation": "Arrange an in-person clinical assessment to confirm the finding.",
        "model": {
            "name": "hear-tb-dual-head",
            "version": "…",
            "available": true
        },
        "duration_s": 1.37
    }
}
```

### `consultation.updated`

Broadcast by `ConsultationUpdated` on status changes and after a briefing is
generated.

```json
{
    "consultation_id": 3,
    "status": "completed",
    "changes": ["report"],
    "report": { "chief_complaint": "…", "red_flags": [] }
}
```

Client side, both are consumed with `useEcho` from `@laravel/echo-react`.

## Python AI service

Base URL `AI_SERVICE_URL` (default `http://127.0.0.1:9000`). Every endpoint
requires `X-Internal-Token: <AI_SERVICE_TOKEN>`; a mismatch is **401**. This
service is never published to the internet — in the Compose stack it has no
published port.

Errors use one envelope:

```json
{ "error": { "code": "model_unavailable", "message": "…", "retryable": true } }
```

### `GET /v1/health`

```json
{
    "status": "ok",
    "device": "cuda",
    "models": {
        "hear": { "loaded": true, "detail": null },
        "classifier": { "loaded": true, "detail": null },
        "embeddings": { "loaded": true, "detail": null },
        "cough_gate": { "loaded": false, "detail": "no trained gate" }
    },
    "vertex": {
        "configured": true,
        "mode": "endpoint",
        "model": "medgemma-4b-it"
    }
}
```

`status` is `degraded` when an expected adapter is missing. `vertex.mode` is
`fake` whenever `VERTEX_ENDPOINT_ID` is unset.

### `POST /v1/cough/analyze`

`multipart/form-data` with an audio file. Decoded by ffmpeg to 16 kHz mono,
gated, embedded, scored, then explained.

```json
{
    "risk_level": "medium",
    "risk_score": 0.61,
    "findings": "…",
    "recommendation": "…",
    "embedding": [0.0123, -0.0456, "… 512 floats"],
    "model": { "name": "…", "version": "…", "available": true },
    "duration_s": 1.37
}
```

`risk_level` is `low` | `medium` | `high` | `unclear`. `unclear` means the
system declined to score — no weights, no audible cough event, or the gate
rejected the sample. It is never a silent zero.

### `POST /v1/briefing`

Request model `BriefingRequest` with `extra="forbid"` — any unexpected field,
including anything identifying, is rejected with **422**.

```json
{
    "subject_token": "subject-7f3a",
    "age": 34,
    "sex": "male",
    "risk_factors": ["smoker", "household contact"],
    "transcript": [{ "role": "user", "text": "cough for three weeks" }],
    "cough": { "risk_level": "medium", "findings": "…", "recommendation": "…" }
}
```

Response:

```json
{
    "chief_complaint": "…",
    "history": "…",
    "risk_factors": ["…"],
    "cough_findings": "…",
    "suggested_questions": ["…"],
    "red_flags": ["…"],
    "disclaimer": "…",
    "degraded": false,
    "generated_by": "medgemma-4b-it"
}
```

`degraded: true` marks a template briefing produced without Vertex.

### `POST /v1/embeddings/audio`

Multipart audio in, HeAR embedding out: `{ "embedding": [...], "dim": 512,
"model": "google/hear-pytorch" }`.

### `POST /v1/embeddings/text`

`{ "texts": ["…"] }` in, EmbeddingGemma vectors out.

### `POST /v1/vision/analyze`

Reserved for chest-image analysis. Returns **501** until enabled.

### Contract test

A live test pins this contract against a running service:

```bash
AI_SERVICE_INTEGRATION=1 DB_CONNECTION=pgsql \
  php artisan test tests/Feature/Consult/AiServiceIntegrationTest.php
```
