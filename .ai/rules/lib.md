---
paths:
    - resources/js/lib/gemini-live.ts
---

# Lib

## Gemini Live API endpoint + model (deprecation trap)

Browser-direct Live voice uses the WS endpoint wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained (v1beta, no version in the path). The backend mints ephemeral tokens via POST https://generativelanguage.googleapis.com/v1beta/auth_tokens. Model must be the fully-qualified models/{model} name and is set by ai.live.model (env AI_LIVE_MODEL). Old model models/gemini-2.0-flash-live-001 was shut down June 1 2026; current is models/gemini-3.1-flash-live-preview. Symptom of a dead model: onerror then onclose right after starting, hint flips to "Voice session ended".

## realtimeInput audio payload shape

Mic audio must be sent as `realtimeInput.audio = { data: base64, mimeType: "audio/pcm;rate=16000" }` — NOT `audio: { audioChunks: [...] }`. The `audioChunks` wrapper is from an old API version and the server closes the socket with 1007 "Unknown name audioChunks at realtime_input.audio". Symptom: greeting plays, session dies the moment the user speaks.

## Gemini Live transcription fields + commit timing

Live API sends transcriptions under serverContent: inputTranscription (final user text), interimInputTranscription (partial, frequent updates), outputTranscription (final assistant text). There is NO guaranteed ordering between these and turnComplete — outputTranscription can arrive AFTER turnComplete. So never commit the transcript on turnComplete; commit on the final transcription message instead (inputTranscription/outputTranscription), and treat interimInputTranscription as live preview only.

## Pin Gemini Live transcription language when crossing languages

Live transcription auto-detects per turn unless pinned. Send inputAudioTranscription { languageCodes: [bcp47] } in the setup message (source: config('ai.live.language') / AI_LIVE_LANGUAGE, default en-US). Without it, STT can flip to another language (e.g. Indian English -> Hindi), which lands in saved session transcripts for the doctor console. Keep setup.system_instruction English too.
