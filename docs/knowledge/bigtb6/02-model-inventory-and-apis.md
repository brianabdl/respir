# BigTB6 — model inventory & API contracts

All specialist services are FastAPI containers on Google Cloud Run, publicly readable
(`--allow-unauthenticated`), project `1039179580375`, region `us-central1`.
Every wrapper follows the same shape: return `{"result": <api json>}` or
`{"error": "<message>"}`; never raise.

## Models

| Modality         | Source repo                                                                                 | Weights                                                                                                     | Notes                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Cough TB         | [SACHokstack/Hear--Cough-Finetuning](https://github.com/SACHokstack/Hear--Cough-Finetuning) | [sach3v/Domain_aware_dual_head_HEar](https://huggingface.co/sach3v/Domain_aware_dual_head_HEar)             | HeAR embeddings + domain-aware dual head; same weights named in this repo's plan |
| Palm anemia      | [Sidharth1743/palm-medsiglip](https://github.com/Sidharth1743/palm-medsiglip)               | [Sidharth1743/palm-medsiglip-linear-probe](https://huggingface.co/Sidharth1743/palm-medsiglip-linear-probe) | MedSigLIP + linear probe                                                         |
| Eye anemia       | [Sidharth1743/medgemma-tb](https://github.com/Sidharth1743/medgemma-tb)                     | [Sidharth1743/eye-medsiglip-linear-probe](https://huggingface.co/Sidharth1743/eye-medsiglip-linear-probe)   | lower-eyelid pallor                                                              |
| Nail anemia      | [LE-TAPU-KOKO/nail-anemia-detection](https://github.com/LE-TAPU-KOKO/nail-anemia-detection) | [JetX-GT/nail-anemia-detector](https://huggingface.co/JetX-GT/nail-anemia-detector)                         |                                                                                  |
| Chest X-ray TB   | [LE-TAPU-KOKO/CHRX-MLP-LINEAR_PROBE](https://github.com/LE-TAPU-KOKO/CHRX-MLP-LINEAR_PROBE) | [JetX-GT/hades-hellix-tb-linear-probe](https://huggingface.co/JetX-GT/hades-hellix-tb-linear-probe)         | rich structured report, see below                                                |
| Resp. rate       | [Sidharth1743/HR-RR-detector](https://github.com/Sidharth1743/HR-RR-detector)               | —                                                                                                           | endpoint exists, no bot tool wired                                               |
| Report synthesis | MedGemma (reports say `MedGemma-4B-IT-Q6K`, llm_version 1.5.0)                              | served via ngrok                                                                                            | see report contract below                                                        |

## Endpoints

| Service     | URL                                                           | Route         | Multipart field           | Timeout |
| ----------- | ------------------------------------------------------------- | ------------- | ------------------------- | ------- |
| Cough TB    | `https://hear-tb-1039179580375.us-central1.run.app`           | `/predict`    | `file` (`audio/wav`)      | default |
| Chest X-ray | `https://chest-xray-1039179580375.us-central1.run.app`        | `/analyze-tb` | `file` (`image/png`)      | 180 s   |
| Palm anemia | `https://palm-anemia-1039179580375.us-central1.run.app`       | `/predict`    | `file` (`image/png`)      | default |
| Nail anemia | `https://nail-anemia-1039179580375.us-central1.run.app`       | `/predict`    | **`image`** (`image/png`) | 90 s    |
| Resp. rate  | `https://respira-medsiglip-1039179580375.us-central1.run.app` | `/predict`    | —                         | —       |
| Eye anemia  | —                                                             | `/predict`    | `file`                    | 90 s    |

**Field-name trap:** four services accept `file`; the nail service accepts `image`
(`reference/nail_anemia_tool.py:39`). Wrong field → 422.

**Eye endpoint trap:** `eye_anemia_tool.py` defaults to the _respira-medsiglip_ URL,
which is the respiratory-rate service, not the eye model — almost certainly a
copy/paste bug (`reference/eye_anemia_tool.py:10`). When porting, resolve the real eye
endpoint or call the HF weights directly.

## Response shapes

### Cough

```json
{ "tb_probability": 0.7507437467575073 }
```

Wrapper interpretation bands (`tb_audio_tool.py:66-73`):

| Probability | Interpretation                                                         |
| ----------- | ---------------------------------------------------------------------- |
| ≥ 0.7       | High probability of TB — recommend immediate professional consultation |
| 0.4 – 0.7   | Moderate probability — recommend getting tested                        |
| < 0.4       | Low probability — monitor symptoms                                     |

### Anemia (palm / eye / nail)

The report synthesizer handles two shapes (`medgemma_reasoning.py:79-90`):

```json
{ "predictions": [{ "prediction": "Anemia", "triage_score": 0.9876 }] }
```

or flat:

```json
{ "prediction": "Non-Anemia", "triage_score": 0.0 }
```

Generated reports show raw scores `0.0000` (non-anemic) up to `0.9988` (anemic), so
`triage_score` is the anemia probability and `prediction` a label at an unstated cutoff.

### Chest X-ray (full contract — reusable as the future schema)

Sample from `server/xray_images/xray_1771940999_Image_001_analysis.json`:

```json
{
    "result": {
        "report_id": "TB-20260224-135213-9637",
        "timestamp": "2026-02-24T13:52:13.188131",
        "schema_version": "1.0.0",
        "who_guideline_reference": "WHO/2022/TB/1.1",
        "patient_id": null,
        "model_info": {
            "vision_model": "MedSigLIP-v4",
            "vision_model_version": "4.0.0",
            "classifier": "LinearProbe",
            "classifier_version": "4.0.0",
            "calibration_method": "PlattScaling",
            "calibration_active": true,
            "llm_reasoning": "MedGemma-4B-IT-Q6K",
            "llm_version": "1.5.0"
        },
        "who_triage": {
            "priority_code": "P2-YELLOW",
            "priority_score": 75,
            "category": "Urgent review needed - Moderate probability or gray zone"
        },
        "classification": {
            "result": "TB Positive — High Probability (Low Spatial Confidence)",
            "severity": "HIGH",
            "raw_probability": 0.6772,
            "calibrated_probability": 0.5199,
            "risk_stratification": "High Risk"
        },
        "anatomical_analysis": {
            "primary_zone": "Right Upper Lobe (RUL)",
            "zones": [
                {
                    "zone_name": "Right Upper Lobe (RUL)",
                    "lobe": "right_upper",
                    "l2_norm_score": 5.74,
                    "normalized_score": 0.0574,
                    "anatomical_prior_weight": 1.1,
                    "confidence_contribution": 0.6081,
                    "is_primary": true
                }
            ],
            "is_salient": true,
            "saliency_threshold": 2.0,
            "spatial_distribution": "diffuse"
        },
        "findings": {
            "summary": "Saliency-detected opacity in Right Upper Lobe (RUL)",
            "detailed": [
                {
                    "finding_type": "opacity",
                    "location": "Right Upper Lobe (RUL)",
                    "severity_score": 0.5199,
                    "size_mm": null,
                    "description": "Saliency-detected opacity in Right Upper Lobe (RUL) with L2-norm activation pattern",
                    "visual_evidence": true,
                    "ai_detected": true,
                    "cross_modal_verified": false,
                    "uncertainty_level": "medium"
                }
            ],
            "total_findings": 1
        },
        "cross_modal_verification": {
            "vision_json_consistent": true,
            "heatmap_correlates_with_json": true
        },
        "differential_diagnosis": {
            "primary_hypothesis": "Active Pulmonary Tuberculosis",
            "ranked_list": [
                {
                    "diagnosis": "Active Pulmonary Tuberculosis",
                    "probability": 0.5199,
                    "rank": 1
                },
                {
                    "diagnosis": "Healed/Old TB with Reactivation Risk",
                    "probability": 0.25,
                    "rank": 2
                }
            ]
        },
        "uncertainty": {
            "epistemic_uncertainty": 0.6875,
            "aleatoric_uncertainty": 0.05,
            "total_uncertainty": 0.7375,
            "confidence_interval_95": [0.3699, 0.6699],
            "prediction_stability": 0.95,
            "spatial_entropy": 0.6875
        },
        "quality_metrics": {
            "image_resolution": [448, 448],
            "preprocessing_applied": [
                "CLAHE",
                "Z-Score_Normalization",
                "Resize_448x448"
            ],
            "tta_views_used": 8,
            "image_quality_score": 0.95,
            "analysis_confidence": "Low (Ambiguous)"
        },
        "clinical_recommendations": {
            "immediate_actions": [
                "Clinical correlation with symptoms and risk factors required"
            ],
            "follow_up_tests": [
                "Sputum AFB smear (2-3 samples)",
                "NAAT/Xpert MTB/RIF if available"
            ],
            "timeframe": "Within 48-72 hours",
            "referral_required": true,
            "isolation_required": false
        },
        "thresholds_applied": {
            "normal_cutoff": 0.15,
            "high_cutoff": 0.45,
            "triage_cutoff": 0.19
        },
        "processing_metadata": {
            "total_processing_time_ms": 118616,
            "device_used": "cpu",
            "precision": "float32"
        }
    }
}
```

Notable for porting:

- WHO triage codes: `P2-YELLOW` etc.; `priority_score` 0–100.
- Distinguishes `raw_probability` vs `calibrated_probability` (Platt scaling) — the
  calibrated value feeds the triage band.
- CPU inference took ~119 s for 8 TTA views at 448×448, so async flow is mandatory.
- One saved analysis was `{"error": ""}` — an empty error string. Treat empty strings as
  no-error (`bot.py:499` does, via truthiness), but when defining a new contract use an
  explicit `null`/omitted field.

### MedGemma report synthesis contract

`medgemma_reasoning.py` POSTs `application/x-www-form-urlencoded`:

| Field           | Value                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `system_prompt` | "You are an expert AI radiologist. Provide a comprehensive final diagnosis report ... plain text paragraphs." |
| `text_context`  | human-readable per-modality lines ("`- cough_x: TB Probability 98.19% - ...`")                                |
| `json_scores`   | JSON string mapping `"<file>_tb"` / `"<file>_anemia"` → score                                                 |

Response: `{"report": "<markdown/text>"}`. Saved to
`medgemma_reports/medgemma_report_<timestamp>.md`. Hardcoded ngrok URL
(`https://nathan-preconversational-ardell.ngrok-free.dev/generate_report`) — ephemeral,
do not depend on it.

### Room / bot / upload API (`main.py`)

| Route          | Method | Input               | Output                                                        |
| -------------- | ------ | ------------------- | ------------------------------------------------------------- |
| `/`            | GET    | —                   | `{"status":"ok"}`                                             |
| `/create-room` | POST   | —                   | `{url, token}` (Daily room + owner token)                     |
| `/start-bot`   | POST   | `{room_url, token}` | `{"status":"started","pid":...}`; spawns `bot.py -t daily -d` |
| `/events`      | GET    | —                   | SSE stream of `{"text","room_url"}` bot-turn events           |
| `/upload_xray` | POST   | multipart `file`    | `{status, path}`; updates `latest.txt`                        |

## Cloud Run deploy reference (`deploy.sh`, server `Dockerfile`)

- Base `python:3.11-slim`, system deps `ffmpeg libavcodec-extra pkg-config`.
- Creates media dirs at build time: `cough_samples eye_images palm_captures
fingernail_images xray_images medgemma_reports`.
- One image runs both services via `start_services.sh` (FastAPI background + bot exec).
- Deploy: `--allow-unauthenticated --memory 4Gi --cpu 2 --timeout 3600`.
- `requirements.txt`: `pipecat-ai[google,webrtc,daily]`,
  `pipecat-ai-small-webrtc-prebuilt`, `python-dotenv`, `fastapi`, `uvicorn[standard]`,
  `aiohttp`, `requests`, `python-multipart`, `Pillow`, `numpy`, `scipy`.
