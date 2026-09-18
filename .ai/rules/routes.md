---
paths:
    - routes/web.php
---

# Routes

## Signed downloads, throttles, server-side consent gates

Security wiring: capture download lives OUTSIDE the EnsurePatient group (doctors are blocked there) in its own auth+verified group with the `signed` middleware; the controller still authorizes owner-or-doctor and audits the download. Consult voice/chat/cough carry named throttles `consult-voice` (20/min), `consult-chat` (30/min), `consult-cough` (10/min) defined in AppServiceProvider. Voice, cough and live/token all abort 403 unless consultations.consented_at is set — consent is enforced server-side, not just in the UI.

## consult-context is its own named throttle, not consult-chat

GET consult/{consultation}/context (conversationContext, recall_conversation_context's backing endpoint) now uses throttle:consult-context (8/min, defined in AppServiceProvider alongside consult-voice/consult-chat/consult-cough), not throttle:consult-chat. It was moved off the shared chat limiter because the model calling this tool has no dedicated cap of its own otherwise.
