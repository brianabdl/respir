---
paths:
    - 'app/Domain/Audit/**'
---

# Audit

## Audit log is append-only and PHI-free

Every patient-data access and external AI call must go through AuditLogger::record with an AuditAction case, actor/subject models, optional destination ('ai-service', 'gemini') and a context array that contains NO clinical content (only risk levels, counts, flags). Wired: doctor index/show, capture download, briefing request (+ job generated), consent recorded, live token, cough analysed. AuditLog has no deleting/updating workflow — treat rows as append-only. IP/user-agent come from request(); jobs run without an actor (actor_id null).
