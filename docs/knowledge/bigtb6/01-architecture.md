# BigTB6 — architecture

Source: `Sidharth1743/BigTb6` @ `549abb8`. Deployed demo: https://big-tb6.vercel.app/

## What it is

Multimodal, voice-driven preliminary TB + anemia screening. One WebRTC session combines:

- cough analysis (TB probability)
- palm / eye / fingernail images (anemia probability)
- chest X-ray upload (TB triage report)
- webcam respiratory-rate estimate
- Gemini Live conversation guiding the patient through all of it

## Four layers

```
┌───────────── Interaction: Gemini Live ─────────────┐
│ WebRTC voice duplex + function calling.             │
│ BigTb6 calls clinical tools directly from the LLM.  │
└──────────────────────────┬──────────────────────────┘
                           ▼
┌───────────── Orchestration: MedGemma ──────────────┐
│ Aggregates saved *_analysis.json files, sends      │
│ text_context + json_scores to a MedGemma endpoint, │
│ writes a consolidated markdown report.             │
└──────────────────────────┬──────────────────────────┘
                           ▼
┌───────────── Specialist models (Cloud Run) ────────┐
│ HeAR cough TB · palm/eye/nail anemia · chest X-ray │
└──────────────────────────┬──────────────────────────┘
                           ▼
┌───────────── Output: voice + transcript ───────────┐
│ Report returned through Gemini Live; bot turns     │
│ streamed to the browser as BOT_TEXT → SSE.         │
└────────────────────────────────────────────────────┘
```

## Runtime flows

### Session start

1. Client `POST /create-room` → FastAPI creates a Daily room + owner token (30 min room,
   1 h token) and returns `{url, token}`.
2. Client `POST /start-bot` with the room → FastAPI spawns `bot.py -t daily -d` as a
   subprocess with `DAILY_ROOM_URL` in the environment.
3. Client joins with `@daily-co/daily-js`; bot joins via Pipecat `DailyTransport`.
4. On `on_client_connected` the bot starts the `AudioBufferProcessor`, captures the
   participant camera at 1 fps, and injects a user message instructing the exact greeting.

### Cough

1. Gemini calls `record_cough_sound` when the user confirms readiness.
2. Handler arms `awaiting_cough_after_prompt`; a pipeline processor starts a 5 s capture
   window on `UserStartedSpeakingFrame`.
3. Audio comes from `AudioBufferProcessor` events (`on_user_turn_audio_data`,
   `on_track_audio_data`), is buffered as raw PCM, then written to WAV (24 kHz mono s16).
4. A queued user message ("Recording complete ... call analyze_cough_for_tb") drives the
   second tool call; the handler posts the WAV to the HeAR endpoint and returns
   `{tb_probability, interpretation}`.

### Image checks (palm / eye / nail)

1. `LatestImageCaptureProcessor` keeps the newest `InputImageRawFrame` in memory.
2. Gemini calls `capture_palm_photo` / `capture_eye_photo` / `capture_fingernail_photo`
   when the user says the body part is visible.
3. Handler saves the frame as PNG, immediately calls the matching anemia API, saves
   `*_analysis.json`, returns the result in the same tool response.
4. `completed_checks` marks the modality; `prompt_next_check()` injects a message asking
   only for the next unfinished check.

### X-ray

1. Client uploads via `POST /upload_xray`; FastAPI stores the file and writes its path to
   `xray_images/latest.txt` (`xray_store.py`) — a file-based handoff between API and bot.
2. Gemini calls `analyze_chest_xray`; the handler returns immediately with
   `FunctionCallResultProperties(run_llm=False)` and runs the API call as a background task.
3. When done, it queues a user message containing the result JSON; Gemini speaks it.

### Consolidated report

`server/medgemma/medgemma_reasoning.py` globs every `*_analysis.json` under
`cough_samples/`, `eye_images/`, `palm_captures/`, `fingernail_images/`, flattens
probabilities into `text_context` + `json_scores`, and POSTs to a MedGemma
`/generate_report` endpoint (hardcoded ngrok URL). Output is a markdown report in
`medgemma_reports/`. See `05-clinical-prompt-and-flow.md`.

## Deployment

| Component                                      | Platform          | Notes                                                    |
| ---------------------------------------------- | ----------------- | -------------------------------------------------------- |
| Next.js client                                 | Vercel            | `client/`                                                |
| FastAPI + bot (`medbrain-api`, `medbrain-bot`) | Cloud Run         | `server/Dockerfile`, both started by `start_services.sh` |
| 5 specialist model APIs                        | Cloud Run, public | see `02-model-inventory-and-apis.md`                     |
| MedGemma report endpoint                       | ngrok tunnel      | ephemeral, hardcoded URL                                 |

Cloud Run settings: 4 GiB memory, 2 CPU, 3600 s timeout, unauthenticated.
`deploy.sh` uses a hardcoded GCP project id.

Local: `./start_all.sh` runs FastAPI on 8000 + bot (`-t webrtc`) on 7860; client on 3000.

## Repo layout

```
BigTb6/
├── server/                  # Python backend
│   ├── bot.py               # Pipecat pipeline, tools, capture logic (950 lines, all state global)
│   ├── main.py              # FastAPI: create-room, start-bot, SSE /events, upload_xray
│   ├── *_tool.py            # aiohttp wrappers for the 5 specialist APIs
│   ├── xray_store.py        # latest-xray path handoff file
│   ├── medgemma/            # report synthesis + generated reports
│   ├── tests/               # pytest (unit + optional integration)
│   └── start_services.sh
├── client/                  # Next.js 16 + React 18 + Tailwind 3
│   ├── app/page.tsx         # entire session UI (619 lines)
│   └── components/          # VideoConsultation, TranscriptPanel, ControlBar, ConnectionStatus
├── gemini-live.py           # standalone raw Gemini Live WebSocket client (no Pipecat)
├── function_helper.py       # reflection-based tool declarations for the raw client
├── official_google/         # copied Google/Pipecat reference docs
└── docs/plans/              # implementation plans with useful API examples
```

## Mapping to this repo (`agentic-medgemma`)

| BigTB6 concept                          | This repo equivalent                                      | Gap / action                                      |
| --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| Gemini Live voice front end via Pipecat | Gemini Live direct WS (`resources/js/lib/gemini-live.ts`) | keep current — browser-direct, no bot subprocess  |
| Gemini calls clinical tools             | Laravel + Python own clinical calls (D9)                  | do **not** port tool-calling topology             |
| HeAR + dual-head TB                     | `ai-service` `hear.py` + `tb_classifier.py`               | same model family, already implemented            |
| MedGemma aggregation                    | Vertex MedGemma `briefing`                                | same source model, privacy-safe path in this repo |
| Palm/eye/nail anemia                    | `POST /v1/vision/analyze` stub                            | **port model endpoints + contracts**              |
| Chest X-ray report                      | deferred vision feature                                   | **port response schema + model links**            |
| Resp-rate webcam (HR-RR)                | none                                                      | optional future feature                           |
| Daily room create/join                  | none (Gemini Live WS)                                     | reference only if WebRTC fallback is ever needed  |
| Consent / pseudonymization / audit      | enforced here (O4, D12, Phase 6)                          | BigTB6 has none — never copy its data path        |
