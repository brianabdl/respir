---
paths:
  - resources/js/pages/consult.tsx
---

# Pages

## Camera is the hero view on /consult
Layout: camera video is the large left/hero panel (gradient controls bar overlays it, Start/Camera gate overlay too) with cameraOn state (re-render driven — reading mediaStreamRef in JSX won't update). Right sidebar: voice status, transcript chat + text fallback, cough assessment, cough record. startVoiceConsult auto-enables camera.

## Gemini Live API voice loop on /consult
startVoiceConsult fetches /consult/{c}/live/token (ephemeral token via POST v1alpha/auth_tokens, server-side key), then browser WS connects directly to Gemini Live (v1alpha BidiGenerateContentConstrained). Libs: @/lib/gemini-live (client, setup + realtimeInput 16k PCM + transcripts) and @/lib/live-audio (LiveMic ScriptProcessor, LiveSpeaker queued 24k playback with barge-in interrupt). Transcript tracks liveChat: assistantLive/userLive buffers flushed on turnComplete; states speaking/generating/listening render as badges. Cough trigger: onTurnComplete detects "ready to record", pause mic, record, re-inject result via sendText. Fallback = turn-based /voice + SSE /chat if WS/token fails.
