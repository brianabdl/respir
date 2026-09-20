# Data Model

PostgreSQL 18 with the `pgvector` extension. Relational records and the cough
embedding vectors live in the same database, so acoustic similarity search is a
plain SQL query rather than a second datastore.

## Entity relationship diagram

```mermaid
erDiagram
    users ||--o{ consultations : "has"
    users ||--o{ audit_logs : "acts in"
    consultations ||--o{ consult_captures : "has"
    consultations ||--o{ consult_session_logs : "has"
    consultations ||--o{ cough_embeddings : "has"
    consult_captures ||--o| cough_embeddings : "produces"
    users ||--o{ consultations : "reviews"
    agent_conversations ||--o{ agent_conversation_messages : "has"
    consultations }o--o| agent_conversations : "references"

    users {
        bigint id PK
        string name
        string role "patient | doctor"
        string email UK
        date date_of_birth
        string sex
        string phone
        string address
        string emergency_contact_name
        string emergency_contact_phone
        timestamp profile_completed_at
        timestamp privacy_policy_accepted_at
        timestamp email_verified_at
    }

    consultations {
        bigint id PK
        bigint user_id FK
        text agent_conversation_id
        string status "chatting | completed"
        jsonb report "clinician briefing"
        jsonb cough_analysis
        string cough_risk "low|medium|high|unclear"
        text clinical_notes
        json follow_up_actions
        boolean is_reviewed
        timestamp reviewed_at
        bigint reviewed_by FK
        timestamp consented_at
    }

    consult_captures {
        bigint id PK
        bigint consultation_id FK
        string type "audio | video | photo"
        string path
        string disk
        string mime_type
        jsonb analysis
        timestamp captured_at
    }

    consult_session_logs {
        bigint id PK
        bigint consultation_id FK
        string agent_conversation_id
        jsonb turns
        timestamp started_at
        timestamp ended_at
    }

    cough_embeddings {
        bigint id PK
        bigint consultation_id FK
        bigint capture_id FK UK
        vector embedding "512 dims, HNSW cosine"
        string risk_level
        string model
    }

    audit_logs {
        bigint id PK
        bigint actor_id FK
        string action
        string subject_type
        bigint subject_id
        string destination
        jsonb context "never clinical content"
        string ip_address
        string user_agent
    }
```

## Tables

### `users`

Patients and doctors share one table, separated by `role` (`patient` default,
`doctor`). `EnsureDoctor` and `EnsurePatient` middleware read it.

`profile_completed_at` gates the consult flow through `EnsureProfileCompleted`:
until onboarding is done, the patient is redirected to
`/onboarding/profile`. `privacy_policy_accepted_at` records acceptance at that
same step.

`date_of_birth` and `sex` are the only personal fields that reach a model, and
only as derived, non-identifying values (age, sex) inside a briefing payload.

### `consultations`

One pre-visit. `status` is `chatting` or `completed` (`ConsultationStatus`).

- `consented_at` — the consent gate. Null means voice, cough, context, and
  live-token endpoints return 403.
- `cough_risk` — consultation-level risk, indexed for the doctor triage filters.
- `cough_analysis` — the full result payload of the latest analysis.
- `report` — the clinician briefing (chief complaint, history, risk factors,
  cough findings, suggested questions, red flags, disclaimer).
- `clinical_notes`, `follow_up_actions`, `is_reviewed`, `reviewed_at`,
  `reviewed_by` — the doctor's own review, added after the AI output, never
  overwritten by it.
- `agent_conversation_id` — links to the `laravel/ai` conversation.

Models use the Laravel 13 `#[Fillable([...])]` attribute, not a `$fillable`
property.

### `consult_captures`

Stored media: cough recordings (`type: audio`), camera video, photos. `path` plus `disk` (the
`local` disk by default) — files never sit in the public directory, and the only
way to read one is a signed, audited download URL.

`analysis` holds the per-capture result, so multiple cough takes each keep their
own score while `AggregateCoughTakes` derives the consultation-level risk.

### `consult_session_logs`

One row per voice session, keyed by the browser's `session_id`, with `turns` as
a JSONB array of `{role, text}`. Upserted as a session progresses, which is how
a dropped connection resumes without losing the transcript.

Up to 600 turns per session, 2000 characters per turn.

### `cough_embeddings`

The pgvector table.

```sql
embedding  vector(512)          -- HeAR output
capture_id bigint UNIQUE        -- one embedding per capture
```

The migration creates an HNSW index (`$table->vectorIndex('embedding')`), and
`FindSimilarCoughs` queries it with the cosine distance operator
(`embedding <=> ?`, ascending) to power "similar cases" in the doctor console. Embeddings are derived acoustic features, not audio: they
cannot be played back as a recording.

Because `capture_id` is unique and cascades on delete, deleting a capture
removes its vector too.

### `audit_logs`

Append-only. Written by `AuditLogger::record()`.

| Column                        | Contents                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `actor_id`                    | Who acted (nullable for system jobs)                      |
| `action`                      | An `AuditAction` case, e.g. `cough.analysed`              |
| `subject_type` / `subject_id` | Polymorphic target, usually a consultation                |
| `destination`                 | External system touched: `gemini`, `ai-service`, `vertex` |
| `context`                     | Small JSONB metadata — counts, ids, flags                 |
| `ip_address` / `user_agent`   | Request origin                                            |

`context` must never contain clinical content. A test asserts this
(`tests/Feature/Security/AuditLogTest.php`).

Actions currently recorded:

```
consultation.list_viewed     consultation.viewed
consultation.updated         consultation.reviewed
consultation.consent_recorded
consultation.live_session_started
consultation.context_retrieved
capture.downloaded           cough.analysed
briefing.requested           briefing.generated
```

### `agent_conversations` / `agent_conversation_messages`

Owned by the `laravel/ai` package: conversation records, message roles, tool
calls, tool results, usage, and approval state for `ConsultAgent`.

## Migrations

```
0001_01_01_000000  users, password_reset_tokens, sessions
0001_01_01_000001  cache
0001_01_01_000002  jobs, job_batches, failed_jobs
2026_09_10_031124  agent_conversations + messages
2026_09_10_034640  consultations
2026_09_10_034641  consult_captures
2026_09_10_044253  users.role
2026_09_10_044254  consult_session_logs
2026_09_10_074357  consultations.consented_at
2026_09_10_080058  CREATE EXTENSION vector
2026_09_10_080059  cough_embeddings (+ HNSW index)
2026_09_10_080731  audit_logs
2026_09_10_120529  consult_captures analysis fields
2026_09_12_224830  drop the abandoned anemia analysis columns
2026_09_16_054900  consultations clinical review fields
2026_09_18_084712  consult_captures.analysis (re-added)
2026_09_18_111528  users personalization fields
2026_09_18_113901  users.privacy_policy_accepted_at
```

The `2026_09_10_080058` migration creates the extension, but PostgreSQL requires
superuser rights for `CREATE EXTENSION`. On a fresh database, run it once by
hand as described in [INSTALLATION.md](INSTALLATION.md) — including for the test
database, which is literally named `:memory:`.

## Retention

Audio and video stay on the clinic's own disk (`local`), referenced by
`consult_captures.path`. There is no automatic purge today; a deployment that
needs one should delete captures on a schedule — the cascade removes the matching
`cough_embeddings` row with it, while `audit_logs` keeps the record that the file
once existed and who touched it.
