---
paths:
  - 'app/Http/Controllers/Doctor/**'
---

# Doctor

## Doctor review console architecture
Roles: users.role (default patient, index on role). Doctor check via User::isDoctor() + EnsureDoctor middleware on /doctor/consultations(/{id}) routes. Live-session transcripts persist via POST /consult/{c}/sessions upserted on agent_conversation_id = browser session_id ("live-..." prefix), turns jsonb [{role,text}] — consult_session_logs table reached from Consultation::sessionLogs() and shown in doctor/index (list) and doctor/show (full transcript + cough analysis + capture downloads). Patients' auth is a required precondition; ephemeral-token route also authorizes requester (not consultation->user).
