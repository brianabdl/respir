# BigTB6 — lessons, bugs & port checklist

Hard-won details from reading `549abb8` end to end. Split into "bugs not to copy",
"architecture anti-patterns vs this repo's locked decisions", and "what to port".

## Bugs found upstream (do not copy)

| #   | Location                      | Problem                                                                                                                                                                        | Fix when porting                                                           |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | `bot.py:36`                   | `sys.path.insert(0, "/home/sach/GEMINI_LIVE/server")` — absolute path from the original dev machine                                                                            | rely on package layout/relative imports                                    |
| 2   | `bot.py:2,6`                  | `import json` twice                                                                                                                                                            | lint                                                                       |
| 3   | `bot.py:387-388`              | `got_user_track_audio = False` assigned twice                                                                                                                                  | lint                                                                       |
| 4   | `eye_anemia_tool.py:10`       | Eye endpoint points at the **respira-medsiglip** (resp. rate) service                                                                                                          | resolve the real eye endpoint / load `eye-medsiglip-linear-probe` directly |
| 5   | `nail_anemia_tool.py:39`      | Nail API expects multipart field **`image`**, all others use `file`                                                                                                            | keep per-service field map, test 422s                                      |
| 6   | `bot.py:404-451`              | `analyze_cough_for_tb` stops recording immediately, but the 5 s `stop_recording_and_analyze` task is still sleeping and later overwrites `last_cough_file_path`                | single owner for the capture lifecycle; cancel the timer on manual stop    |
| 7   | `bot.py:782-797`              | Two audio-buffer handlers (`on_audio_data`, `on_track_audio_data`) can both append to the cough buffer with different semantics (`not got_user_track_audio` guard on only one) | pick one source (track audio), document it                                 |
| 8   | `xray_..._analysis.json`      | One saved result was `{"error": ""}` — empty-string error                                                                                                                      | use `None`/omitted; truthiness checks only mask this                       |
| 9   | `medgemma_reasoning.py:7`     | Hardcoded ephemeral ngrok URL; `requests.post(data=...)` assumes form-encoded                                                                                                  | config-driven endpoint, retries, timeout                                   |
| 10  | `main.py:33`                  | `@app.on_event("startup")` deprecated                                                                                                                                          | lifespan handler                                                           |
| 11  | `bot.py:425,473,...`          | `datetime.utcnow()` deprecated on 3.12+                                                                                                                                        | `datetime.now(timezone.utc)`                                               |
| 12  | `main.py:145-183`             | Every `/start-bot` call spawns a bot subprocess with no dedupe or auth; no reaper for orphans                                                                                  | one bot per room, idempotent, auth + lifecycle owner                       |
| 13  | `main.py:30,188`              | `/events` SSE has no auth; module set grows/never bounded; anyone can subscribe to all transcripts                                                                             | authenticated channel (Reverb here) instead                                |
| 14  | `main.py:18-24`               | `allow_origins=["*"]` with `allow_credentials=True` — invalid per CORS spec and needlessly open                                                                                | explicit origins                                                           |
| 15  | `server/pyproject.toml`       | Empty dependencies; real deps live only in unpinned `requirements.txt`                                                                                                         | pin via lockfile                                                           |
| 16  | `client/app/page.tsx:132-297` | Failed join leaks the Daily call object; retry silently no-ops (`if (callObjectRef.current) return`)                                                                           | destroy on failure, reset ref                                              |
| 17  | `bot.py:52-67`                | All session state is module-global; safe only because each Daily session gets a fresh subprocess                                                                               | keep state in a session object                                             |

## Architecture anti-patterns (conflict with this repo)

Current locked decisions: **D9** Gemini is interaction-only — never cough analysis,
clinical reasoning, or briefing. **D12** explicit consent, local media only,
pseudonymized Vertex prompts. **Phase 6** audit of every external AI call.

BigTB6 does the opposite:

1. **Gemini Live calls clinical tools directly** (`record_cough_sound`,
   `analyze_chest_xray`, ...). Do not port this topology; keep clinical calls in
   Laravel jobs → `ai-service`.
2. **All clinical data goes to public unauthenticated endpoints** (5 Cloud Run services,
   MedGemma over ngrok). This repo must self-host or call authenticated services, and
   never send identifiers.
3. **No consent gate, no audit, no pseudonymization, no retention policy.** Cough WAVs,
   body-part photos, and X-rays accumulate on the container disk next to analysis JSON.
4. **Free-form MedGemma output with definitive language** ("most likely diagnosis is
   Tuberculosis", "immediate consultation ... strongly advised"). This repo's briefing
   contract is structured JSON with red flags and an explicit disclaimer.
5. **File-based IPC** (`xray_images/latest.txt`) is global to the container: two
   concurrent sessions would analyze each other's X-ray. Use the DB/queue keyed by
   consultation.
6. **Unbounded media dirs** inside the image — fine for a demo, not for a clinic.

## What to port (value ranking)

1. **Model inventory + weights** (`02-model-inventory-and-apis.md`) — palm/eye/nail
   anemia and chest X-ray are genuinely new capabilities for this repo; the models are
   public and fit `POST /v1/vision/analyze`.
2. **X-ray response schema** — richer than the current stub: WHO triage code,
   calibrated vs raw probability, zone-level saliency, uncertainty, recommendations.
   Adopt as the contract for the deferred vision phase (adapted to the repo's
   `{error:{code,message,retryable}}` envelope).
3. **Multipart contracts** — exact field names, content types, timeouts, and error
   shapes per service, plus the interpretation thresholds.
4. **Pipecat processors** (`03-...`): newest-frame capture, cough capture window with
   readiness arming + cooldown, and `FunctionCallResultProperties(run_llm=False)` for
   long async calls with injected completion messages.
5. **Prompt blocks** (`05-...`): readiness phrase list, symptom trigger keywords,
   spoken-output constraint, "one pending check at a time", fixed disclaimer.
6. **Daily.co plumbing** (`04-...`) — only if a WebRTC transport is ever added:
   `subscribeToTracksAutomatically: false` + explicit `setSubscribedTracks`, hidden
   `<audio>` element + gesture unlock, `audio`/`customAudio` fallback, SSE transcript
   room filtering.
7. **Reference wrappers** in `reference/` — small, MIT-licensed, easy to adapt to
   `ai-service` async clients. Keep the `{"result": ...}` / `{"error": ...}` shape or
   map it to the repo's error envelope.

## What not to port

- Gemini → clinical tool calling.
- Public endpoints, ngrok, unauthenticated SSE.
- Module-global state and file-based cross-process IPC.
- Per-session bot subprocess + stdout scraping for transcripts (Reverb exists here).
- Free-form clinical report prompt; the model output needs structured, validated JSON.
- The uninstrumented media storage; captures here are signed-download, audited assets.

## Verification notes for reuse

- Endpoints were live and returned the documented JSON as of 2026-02-24/25 (analysis
  JSONs and reports committed to the repo). Treat them as untrusted infrastructure and
  re-verify schemas before depending on them.
- The anemia services are not versioned in the response; only the X-ray report carries
  `schema_version`, `model_info`, and thresholds. Expect drift.
- CPU timing on X-ray: ~119 s for 8 TTA views at 448×448 — budget async jobs
  accordingly, and keep upload limits in mind.
- The nail endpoint's response was never clearly modeled in the report
  ("no specific findings reported... only score"); verify before wiring UI copy.
