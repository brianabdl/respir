---
paths:
    - 'ai-service/**'
---

# Ai Service

## MedGemma runs on Vertex AI via Python only; pseudonymize payloads

MedGemma is hosted by the supervisor on Google Vertex AI (Model Garden dedicated endpoint) and is called ONLY from the Python ai-service, never from Laravel (laravel/ai has no Vertex provider). No Ollama dependency. Env: VERTEX_PROJECT, VERTEX_LOCATION, VERTEX_ENDPOINT_ID, VERTEX_MEDGEMMA_MODEL (default 4B-it), auth via ADC or GOOGLE_APPLICATION_CREDENTIALS. Outbound Vertex payloads must be pseudonymized: never send patient name, email, or identifiers — use a synthetic subject token. Structured output = schema prompt + pydantic validation + one repair retry; on Vertex failure fall back to classifier-only findings/template briefing and surface 'vertex_unavailable' in /health.
