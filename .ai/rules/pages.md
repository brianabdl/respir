---
paths:
    - resources/js/pages/consult.tsx
---

# Pages

## Camera is the hero view on /consult

Layout: camera video is the large left/hero panel (gradient controls bar overlays it, Start/Camera gate overlay too) with cameraOn state (re-render driven — reading mediaStreamRef in JSX won't update). Right sidebar: voice status, transcript chat + text fallback, cough assessment, cough record. startVoiceConsult auto-enables camera.

## Gemini Live API voice loop on /consult

startVoiceConsult fetches /consult/{c}/live/token (ephemeral token via POST v1alpha/auth_tokens, server-side key), then browser WS connects directly to Gemini Live (v1alpha BidiGenerateContentConstrained). Libs: @/lib/gemini-live (client, setup + realtimeInput 16k PCM + transcripts) and @/lib/live-audio (LiveMic ScriptProcessor, LiveSpeaker queued 24k playback with barge-in interrupt). Transcript tracks liveChat: assistantLive/userLive buffers flushed on turnComplete; states speaking/generating/listening render as badges. Cough trigger: onTurnComplete detects "ready to record", pause mic, record, re-inject result via sendText. Fallback = turn-based /voice + SSE /chat if WS/token fails.

## Consult page: consent gate + Echo events drive cough results

Echo is configured once in app.tsx via initEcho() (resources/js/lib/echo.ts, configureEcho broadcaster reverb). The page subscribes with useEcho on private channel `consultation.{id}` to events `cough.analysis` (payload: risk_level, cough_risk, cough_analysis) and `consultation.updated`. Cough POST returns 202; results only arrive via Echo, so never parse the POST response for analysis. ConsentGate must succeed (POST consult/{id}/consent) before startVoiceConsult() is allowed; consented state comes from consultation.consented_at. Voice/camera still ride the Gemini Live client in resources/js/lib/gemini-live.ts.
