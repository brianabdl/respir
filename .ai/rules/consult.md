---
paths:
  - 'app/Http/Controllers/Consult/**'
---

# Consult

## Consult SSE chat + cough pipeline contract
Chat streams via SSE events {type:'delta',delta} and {type:'done'} — frontend parses with fetch ReadableStream, not Inertia. ConsultAgent uses RemembersConversations keyed by consultations.agent_conversation_id; CoughAnalysisAgent returns structured {risk_level,findings,recommendation}, 'unclear' risk = analysis failed (non-blocking fallback saved). Agent fakes via XxxAgent::fake() in tests; running pest locally needs DB_CONNECTION=pgsql (sqlite driver missing in this PHP build).

## Consult voice turn + SSE chat contract
Primary UX is voice-by-voice: POST consult.voice takes recorded speech (FormData audio), runs Gemini STT (Transcription::of), ConsultAgent->prompt(), Gemini TTS (Audio::of voice default-female), returns JSON {transcript, reply, audio, mime} with audio as base64; frontend plays data-URI wav. Frontend triggers cough capture when reply contains "ready to record". Text chat fallback streams SSE events {type:'delta'}/{type:'done'}. CoughAnalysisAgent returns structured {risk_level,findings,recommendation}; 'unclear' risk = failed analysis fallback. Fakes: XxxAgent::fake(), Transcription::fake(), Audio::fake(); pest needs DB_CONNECTION=pgsql (sqlite driver missing).

## Consult voice turn + SSE chat contract
Primary UX is hands-free voice: POST consult.voice accepts optional FormData audio OR message text; no input = greeting turn (agent scripted to greet as extroverted nurse "Sage" and ask name first). Flow on server = optional Gemini STT (Transcription::of) → ConsultAgent->prompt() → Gemini TTS (Audio::of voice default-female); returns JSON {transcript, reply, audio(base64), mime}. Frontend: user gestures "Start Voice Consult" (autoplay+mic permission), then continuous SpeechRecognition turn-taking; reply includes "ready to record" triggers cough capture. Text chat fallback streams SSE {type:'delta'}/{type:'done'} via /chat. Fakes: XxxAgent::fake(), Transcription::fake(), Audio::fake(); pest needs DB_CONNECTION=pgsql (sqlite driver missing).

## Each session starts a fresh conversation
Consultations are never "continued" across page loads: index() returns no stored history, and voice()/chat() only resume an agent conversation when agent_conversation_id is set from the current browser session. voice() treats greeting (no audio+no message) or new_session boolean as fresh; /chat falls back same way via new_session. Live API WS sessions are always brand new (Browser session context is its own). Stored agent_conversation_id persists only within a session for the turn-based fallback chain.
