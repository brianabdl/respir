---
paths:
    - 'app/Http/Controllers/Consult/**,app/Ai/Agents/**,resources/js/pages/consult.tsx'
---

# Agents Js Pages

## Cough-capture trigger is a real tool call, not string matching

ConsultAgent now implements HasTools with StartCoughCaptureTool (app/Ai/Tools/StartCoughCaptureTool.php, wire name "start_cough_capture" set via explicit name() — ToolNameResolver falls back to the class basename otherwise). voice() sets request_cough by checking $response->toolCalls, not str_contains($reply, ...). chat()'s SSE stream emits a {type:'tool', name:'start_cough_capture'} event when the agent calls it (frontend: triggerCoughCapture() in consult.tsx, wired in send()'s SSE loop). handleAssistantCue's "microphone" keyword match is now a backup-only safety net for both tracks, same role it already played for the Live path — never the primary trigger. When faking ConsultAgent in tests, queue a Laravel\Ai\Responses\Data\ToolCall instance (not a string) to simulate the cough-capture step.

ConsultAgent::basePersona() is the single source of truth for the Sage persona/interview flow, shared by ConsultAgent::instructions() (fallback) and ConsultationController::liveSystemInstruction() (Live). Previously these were two independently hand-written prompts that had drifted (different wording for the same cough-announcement line). Edit basePersona() for shared behavior; each call site appends only its own tool-specific closing paragraphs.

GET consult/{consultation}/context now throttles on its own named limiter `consult-context` (8/min, AppServiceProvider), not the shared `consult-chat` limiter — the system instruction's "at most twice per session" cap on recall_conversation_context was previously prompt-only with no server-side enforcement.
