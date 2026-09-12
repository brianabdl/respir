# BigTB6 — reusable knowledge base

Analysis of [Sidharth1743/BigTb6](https://github.com/Sidharth1743/BigTb6), a finished
Python-only implementation of the same clinical screening idea as this repo. Captured
2026-09-10 from commit `549abb8` ("deploy"). MIT licensed.

BigTB6 screens for TB + anemia in one voice-guided session:

- cough audio → TB probability (HeAR dual-head)
- palm / lower-eyelid / fingernail images → anemia (MedSigLIP linear probes)
- chest X-ray → TB report (Hades/Hellix probe + MedGemma reasoning)
- realtime respiratory rate via webcam (HR-RR detector)
- Gemini Live (Pipecat + Daily WebRTC) as the voice front end
- MedGemma synthesizes one consolidated report at the end

## Why it matters for `agentic-medgemma`

This repo already owns what BigTB6 proved _clinically_ (cough, briefing, Gemini Live
interaction). BigTB6 adds working, published model endpoints and reference
implementations for the **not-yet-built** parts: anemia from palm/eye/nail, chest X-ray
analysis, multimodal capture flows, and clinician-report synthesis. Model weights and
endpoint contracts below are the reusable assets — the orchestration topology is _not_
(see `06-lessons-and-pitfalls.md` for why it conflicts with locked decisions D9/D12).

## Map

| File                                 | Contents                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `01-architecture.md`                 | Layers, runtime flows, deployment map, repo layout, mapping to this repo  |
| `02-model-inventory-and-apis.md`     | Model repos, HF weights, endpoint contracts, response schemas, thresholds |
| `03-pipecat-gemini-live-patterns.md` | Reusable Pipecat + Gemini Live backend patterns with code                 |
| `04-voice-ui-and-daily-patterns.md`  | Daily.co WebRTC + Next.js client patterns                                 |
| `05-clinical-prompt-and-flow.md`     | System prompt, tool rules, completion tracking, report synthesis          |
| `06-lessons-and-pitfalls.md`         | Bugs, security gaps, architectural anti-patterns, port checklist          |
| `reference/`                         | Small standalone wrapper modules, copied verbatim (see notes inside)      |

## Top reuse candidates

1. **Anemia model endpoints** (`palm-medsiglip-linear-probe`, `eye-medsiglip-linear-probe`,
   `nail-anemia-detector`) — implemented 2026-09-10 in `ai-service` as
   `POST /v1/vision/anemia` (self-hosted weights, per-capture results, Reverb
   `anemia.analysis`), replacing the old `vision/analyze` stub for this modality.
2. **Chest X-ray contract** — the response JSON in `02-model-inventory-and-apis.md` is a
   ready-made schema for the deferred X-ray feature; richer than anything currently planned.
3. **Pipecat processors** — `LatestImageCaptureProcessor`, the cough capture window, and
   `FunctionCallResultProperties(run_llm=False)` async-result pattern.
4. **Voice-session prompt flow** — readiness phrases, proactive anemia screening wording,
   "one pending check at a time" completion tracking.
5. **Daily.co client plumbing** — manual track subscription, autoplay gesture unlock,
   `BOT_TEXT` stdout → SSE transcript bridge.

## Hard rule before reuse

BigTB6 sends all clinical data (cough, images, transcripts) to public, unauthenticated
Cloud Run endpoints and an ngrok MedGemma tunnel, and lets Gemini Live call clinical
tools directly. This repo's locked decisions forbid both (D9: Gemini interaction only;
D12: consent + pseudonymization). Port **models and contracts**, not that topology.
