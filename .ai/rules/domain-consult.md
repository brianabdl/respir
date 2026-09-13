---
paths:
    - 'app/Domain/Consult/**'
---

# Domain Consult

## Consult domain: Python client, async cough, pseudonymized briefing

PythonAiClient is the only gateway to the Python ai-service (header X-Internal-Token; timeout/retries from config services.ai_service). Cough analysis is async: RecordCoughSample stores capture then AnalyseCough runs on queue 'ai' and broadcasts CoughAnalysisCompleted on private consultation.{id}. GenerateClinicianBriefing sends a de-identified payload built by BriefingPayloadBuilder: patient name replaced with PATIENT_{user_id}, emails redacted, no name/email fields allowed (Python BriefingRequest forbids extras). Gemini remains interaction-only (chat/voice/live token) — never route clinical reasoning there. Jobs must call $this->onQueue('ai') in the constructor because Illuminate\Bus\Queueable already defines an untyped $queue property. On service failure jobs persist an 'unclear'/degraded fallback and still broadcast.

## Embedding persistence, similarity, briefing regeneration

Phase 5 additions: AnalyseCough persists the HeAR vector via CoughEmbedding::updateOrCreate on capture_id (unique) when the Python response embedding is non-empty — failures persist nothing. FindSimilarCoughs binds the raw vector literal into `embedding <=> ? as distance`, orders ascending, and returns a plain array (Collection generics trigger PHPStan invariance errors). Doctor-only routes: POST doctor/consultations/{id}/briefing dispatches GenerateClinicianBriefing (202), GET doctor/consultations/{id}/similar. The doctor UI listens to `consultation.updated` to refresh the briefing live.
