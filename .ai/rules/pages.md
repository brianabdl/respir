---
paths:
    - resources/js/pages/consult.tsx
    - resources/js/pages/welcome.tsx
    - 'resources/js/pages/**'
---

# Pages

## Camera is the hero view on /consult

Layout: camera video is the large left/hero panel (gradient controls bar overlays it, Start/Camera gate overlay too) with cameraOn state (re-render driven — reading mediaStreamRef in JSX won't update). Right sidebar: voice status, transcript chat + text fallback, cough assessment, cough record. startVoiceConsult auto-enables camera.

## Gemini Live API voice loop on /consult

startVoiceConsult fetches /consult/{c}/live/token (ephemeral token via POST v1alpha/auth_tokens, server-side key), then browser WS connects directly to Gemini Live (v1alpha BidiGenerateContentConstrained). Libs: @/lib/gemini-live (client, setup + realtimeInput 16k PCM + transcripts + client tool calling) and @/lib/live-audio (LiveMic ScriptProcessor, LiveSpeaker queued 24k playback with barge-in interrupt). Transcript tracks liveChat: assistantLive/userLive buffers flushed on turnComplete; states speaking/generating/listening render as badges. Cough trigger = client-side function call: setup declares `start_cough_capture` via `tools[].functionDeclarations` (BidiGenerateContentSetup has NO toolConfig field — server rejects unknown setup fields and closes the WS silently, so surface json.error to onError), server sends toolCall, client onFunctionCall pauses mic/audio, records via startCough, replies toolResponse.functionResponses (blocking keeps the model silent during recording). Transcript keyword check in handleAssistantCue is a backup only, also wired to the done event of the SSE /chat fallback. Fallback = turn-based /voice + SSE /chat if WS/token fails.

## Consult page: consent gate + Echo events drive cough results

Echo is configured once in app.tsx via initEcho() (resources/js/lib/echo.ts, configureEcho broadcaster reverb). The page subscribes with useEcho on private channel `consultation.{id}` to events `cough.analysis` (payload: risk_level, cough_risk, cough_analysis) and `consultation.updated`. Cough POST returns 202; results only arrive via Echo, so never parse the POST response for analysis. ConsentGate must succeed (POST consult/{id}/consent) before startVoiceConsult() is allowed; consented state comes from consultation.consented_at. Voice/camera still ride the Gemini Live client in resources/js/lib/gemini-live.ts.

## Product branding is Respir

The clinic agentic-AI product is branded "Respir". Landing/landing copy must use Respir branding. The agent persona stays "Sage" — brand name and agent name are distinct. The design source of truth is root `DESIGN.md`.

## Landing (welcome.tsx) is the design identity; consult is pending restyle

`welcome.tsx` follows `DESIGN.md`: black background, white type, #94A3B8 slate accent, #71717A mono labels, single 14px radius, monochrome mockup, explicit hexes so it stays dark regardless of theme. The consult page and app-wide tokens are still on the legacy light palette; both are pending a restyle to `DESIGN.md` — do not treat the legacy light look as the design.

## end_consultation tool is the only graceful Live-close path

Close the Gemini Live session only through the end_consultation tool call. Never teardownLiveSession directly after a cough upload (that instant-kills the socket before Sage speaks). Flow: successful cough -> tool response note (tool path) or promptModelWrapUp sendText (manual path) -> model delivers closing turn and calls end_consultation -> handleEndConsultation sets closingRef -> turnComplete/audio drain triggers beginGracefulClose. beginGracefulClose drains the speaker (<=20s) then teardown. scheduleForcedClose (20s) is a safety net for a model that never calls the tool. Transcript string matching (handleAssistantCue/microphone) is NOT a session-close trigger.

## Echo listeners need leading dot for custom broadcastAs names

Custom broadcastAs() names must be subscribed with a leading dot (e.g. '.cough.analysis'). Without it, laravel-echo prepends the App.Events namespace, the handler silently never fires, and the UI hangs (proven live: consult page looped "analysing" while the backend had finished).
