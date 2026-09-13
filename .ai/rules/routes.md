---
paths:
    - routes/web.php
---

# Routes

## Signed downloads, throttles, server-side consent gates

Security wiring: capture download lives OUTSIDE the EnsurePatient group (doctors are blocked there) in its own auth+verified group with the `signed` middleware; the controller still authorizes owner-or-doctor and audits the download. Consult voice/chat/cough carry named throttles `consult-voice` (20/min), `consult-chat` (30/min), `consult-cough` (10/min) defined in AppServiceProvider. Voice, cough and live/token all abort 403 unless consultations.consented_at is set — consent is enforced server-side, not just in the UI.
