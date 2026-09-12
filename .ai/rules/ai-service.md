---
paths:
    - 'ai-service/**'
---

# Ai Service

## MedGemma runs on Vertex AI via Python only; pseudonymize payloads

MedGemma is hosted by the supervisor on Google Vertex AI (Model Garden dedicated endpoint) and is called ONLY from the Python ai-service, never from Laravel (laravel/ai has no Vertex provider). No Ollama dependency. Env: VERTEX_PROJECT, VERTEX_LOCATION, VERTEX_ENDPOINT_ID, VERTEX_MEDGEMMA_MODEL (default 4B-it), auth via ADC or GOOGLE_APPLICATION_CREDENTIALS. Outbound Vertex payloads must be pseudonymized: never send patient name, email, or identifiers — use a synthetic subject token. Structured output = schema prompt + pydantic validation + one repair retry; on Vertex failure fall back to classifier-only findings/template briefing and surface 'vertex_unavailable' in /health.

## HeAR pytorch + joblib dual-head TB classifier are the real loaders

HeAR must load `google/hear-pytorch` (transformers ViT, 512-d pooler), NOT `google/hear` — the latter is a TensorFlow SavedModel with no config.json and cannot load via AutoModel. Input is one 2s@16kHz clip preprocessed by app/services/hear_preprocess.py (mel-PCEN -> 1x192x128); longer audio is averaged over 2s windows. The TB classifier repo `sach3v/Domain_aware_dual_head_HEar` ships a joblib dict (model_p/model_f XGBoost + scaler_p/scaler_f StandardScaler, 512-d input) that is averaged — it is not an AutoModelForSequenceClassification. Adapter contract tests stub these classes; real-model smoke: POST /v1/cough/analyze should return model.available=true.
