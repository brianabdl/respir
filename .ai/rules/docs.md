---
paths:
  - 'docs/**'
---

# Docs

## Keep docs/ in sync with routes, schema, and thresholds
Technical documentation lives in `docs/` (ARCHITECTURE, INSTALLATION, CONFIGURATION, API, DATA-MODEL, AI-PIPELINE, SECURITY, DEPLOYMENT, TESTING, THIRD-PARTY); the root README is the short intro and links to them. The competition submission is judged on these files, so they must stay true.

Update the matching doc in the same change when you touch: routes or request rules (API.md), migrations (DATA-MODEL.md), env vars (CONFIGURATION.md), risk thresholds or job retry settings (AI-PIPELINE.md), Compose/Caddy (DEPLOYMENT.md), or dependencies (THIRD-PARTY.md).

Do not resurrect OVERVIEW.md — it was deleted as stale (described Ollama and Laravel 12).
