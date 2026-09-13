---
paths:
  - 'app/Http/Controllers/Consult/**,resources/js/pages/consult.tsx'
---

# Js Pages

## recall_conversation_context tool returns patient-stated turns only
The Live client declares tools [start_cough_capture, recall_conversation_context]. GET /consult/{consultation}/context?q= (throttle:consult-chat, consent-gated, audited via AuditAction::ConversationContextRetrieved, destination gemini) searches ONLY patient-stated conversation: consult_session_logs.turns + fallback agent_conversation_messages (via RecallConversationContext domain action, bounded 24 turns/8 terms). NEVER include cough_analysis, report, or cough_risk in the tool response — that would let Gemini perform clinical reasoning, violating the interaction-only boundary. Name is recall_conversation_context; system instruction limits it to max two calls per session. Regenerated wayfinder output and bun check:fix reformat collateral files — that is expected after wayfinder:generate --with-form.
