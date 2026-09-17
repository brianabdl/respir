<?php

namespace App\Http\Controllers\Consult;

use App\Ai\Agents\ConsultAgent;
use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Enums\AuditAction;
use App\Domain\Consult\Actions\RecallConversationContext;
use App\Domain\Consult\Actions\RecordCoughSample;
use App\Domain\Consult\Actions\SaveSessionTranscript;
use App\Domain\Consult\Actions\StartConsultation;
use App\Domain\Consult\DTOs\VoiceTurnResult;
use App\Domain\Consult\Jobs\AnalyseCough;
use App\Http\Controllers\Controller;
use App\Http\Requests\Consult\CaptureRequest;
use App\Http\Requests\Consult\ChatMessageRequest;
use App\Http\Requests\Consult\ConsentRequest;
use App\Http\Requests\Consult\CoughSampleRequest;
use App\Http\Requests\Consult\VoiceRequest;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;
use Laravel\Ai\Audio;
use Laravel\Ai\Responses\Data\ToolCall;
use Laravel\Ai\Streaming\Events\StreamEnd;
use Laravel\Ai\Streaming\Events\TextDelta;
use Laravel\Ai\Streaming\Events\ToolCall as ToolCallEvent;
use Laravel\Ai\Transcription;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ConsultationController extends Controller
{
    /**
     * Name of the ConsultAgent tool that signals it is time to record a cough sample. Detecting
     * the real tool call — instead of pattern-matching the agent's spoken reply — keeps the
     * fallback voice/chat tracks reliable even if the model paraphrases its announcement.
     */
    private const START_COUGH_CAPTURE_TOOL = 'start_cough_capture';

    public function __construct(
        private StartConsultation $startConsultation,
        private SaveSessionTranscript $saveSessionTranscript,
        private RecallConversationContext $recallConversationContext,
        private RecordCoughSample $recordCoughSample,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * Show the consult page for a user, creating a consultation on first use.
     */
    public function index(Request $request): Response
    {
        $consultation = $this->startConsultation->forUser($request->user());

        return inertia('consult', [
            'consultation' => $consultation->only(['id', 'status', 'report', 'cough_analysis', 'cough_risk', 'consented_at']),
            'captures' => $consultation->captures()->get([
                'id', 'type', 'path', 'mime_type', 'captured_at',
            ]),
        ]);
    }

    /**
     * Start a new consultation.
     */
    public function store(Request $request): RedirectResponse
    {
        $consultation = $this->startConsultation->forUser($request->user());

        return redirect()->route('consult', $consultation);
    }

    /**
     * Record the patient's informed consent for AI processing.
     */
    public function consent(ConsentRequest $request, Consultation $consultation): JsonResponse
    {
        $consultation->forceFill([
            'consented_at' => $consultation->consented_at ?? now(),
        ])->save();

        $this->auditLogger->record(
            AuditAction::ConsentRecorded,
            actor: $request->user(),
            subject: $consultation,
            context: ['consented_at' => $consultation->consented_at?->toIso8601String()],
        );

        return response()->json([
            'consented_at' => $consultation->consented_at?->toIso8601String(),
        ]);
    }

    /**
     * Stream the agent's reply for the given chat message.
     */
    public function chat(ChatMessageRequest $request, Consultation $consultation): StreamedResponse
    {
        $agent = $this->agentFor(
            $consultation,
            $request->user(),
            fresh: $request->boolean('new_session'),
        );

        $response = $agent->stream($request->validated('message'));

        return response()->stream(function () use ($response, $consultation): void {
            echo ":ok\n\n";

            foreach ($response as $event) {
                if ($event instanceof TextDelta) {
                    echo sprintf("data: %s\n\n", json_encode(['type' => 'delta', 'delta' => $event->delta]));
                }

                if ($event instanceof ToolCallEvent && $event->toolCall->name === self::START_COUGH_CAPTURE_TOOL) {
                    echo sprintf("data: %s\n\n", json_encode(['type' => 'tool', 'name' => $event->toolCall->name]));
                }

                if ($event instanceof StreamEnd) {
                    echo sprintf("data: %s\n\n", json_encode(['type' => 'done']));

                    if ($consultation->agent_conversation_id === null) {
                        $consultation->forceFill([
                            'agent_conversation_id' => $response->conversationId,
                        ])->save();
                    }
                }

                if (ob_get_level() > 0) {
                    @ob_flush();
                }

                flush();
            }
        }, 200, [
            'Content-Type' => 'text/event-stream; charset=UTF-8',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Process a full voice turn: optionally transcribe spoken audio, reply,
     * and generate agent speech. With no input the agent opens the session
     * with a friendly greeting.
     */
    public function voice(VoiceRequest $request, Consultation $consultation): JsonResponse
    {
        abort_unless($consultation->consented_at !== null, 403, 'Consent is required before a voice session.');

        $file = $request->file('audio');
        $message = $request->validated('message');
        $internalInstruction = false;
        $greetingTurn = $file === null && $message === null;

        if ($greetingTurn) {
            $message = 'Greet the patient for the first time like an extroverted, warm and friendly '
                .'intake nurse. Introduce yourself as Sage and ask their name. Ask that one '
                .'question only — do not bundle any other question into this first turn.';
            $internalInstruction = true;
        } elseif ($file !== null && $message === null) {
            try {
                $message = (string) Transcription::of($file)->generate();
            } catch (\Throwable $exception) {
                report($exception);

                return response()->json([
                    'transcript' => null,
                    'reply' => null,
                    'audio' => null,
                    'mime' => null,
                    'error' => 'transcription_failed',
                ], 422);
            }
        }

        $agent = $this->agentFor(
            $consultation,
            $request->user(),
            fresh: $request->boolean('new_session') || $greetingTurn,
        );

        $response = $agent->prompt((string) $message);

        $reply = $response->text;

        $consultation->forceFill([
            'agent_conversation_id' => $response->conversationId
                ?? $consultation->agent_conversation_id,
        ])->save();

        $turn = new VoiceTurnResult(
            transcript: $internalInstruction ? null : (string) $message,
            reply: $reply,
            audio: $this->speak($reply),
            mime: 'audio/wav',
            requestCough: $this->calledStartCoughCapture($response->toolCalls),
        );

        return response()->json($turn->toArray());
    }

    /**
     * Persist (upsert) the full transcript of one patient voice session so the
     * reviewing doctor can read it later.
     */
    public function sessionLog(Consultation $consultation): JsonResponse
    {
        $this->authorizeConsultation($consultation, request()->user());

        $validated = request()->validate([
            'session_id' => ['required', 'string', 'max:60'],
            'agent_conversation_id' => ['nullable', 'string', 'max:36'],
            'turns' => ['required', 'array', 'max:600'],
            'turns.*.role' => ['required', 'string', 'in:user,assistant'],
            'turns.*.text' => ['required', 'string', 'max:2000'],
            'started_at' => ['nullable', 'date'],
            'ended' => ['nullable', 'boolean'],
        ]);

        $this->saveSessionTranscript->upsert($consultation, $validated);

        return response()->json(['saved' => true], 201);
    }

    /**
     * Search this consultation's prior conversation (earlier voice sessions
     * and the fallback chat) so a Live session can recall what was said.
     * Only patient-stated turns are returned — never stored clinical analysis.
     */
    public function conversationContext(Request $request, Consultation $consultation): JsonResponse
    {
        $this->authorizeConsultation($consultation, $request->user());

        abort_unless($consultation->consented_at !== null, 403, 'Consent is required before recalling conversation context.');

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:200'],
        ]);

        $query = (string) ($validated['q'] ?? '');

        $result = $this->recallConversationContext->forConsultation($consultation, $query);

        $this->auditLogger->record(
            AuditAction::ConversationContextRetrieved,
            actor: $request->user(),
            subject: $consultation,
            destination: 'gemini',
            context: ['turns_returned' => $result['found']],
        );

        return response()->json($result);
    }

    /**
     * Save the recorded cough sample and queue it for analysis.
     */
    public function cough(CoughSampleRequest $request, Consultation $consultation): JsonResponse
    {
        abort_unless($consultation->consented_at !== null, 403, 'Consent is required before recording a cough.');

        $capture = $this->recordCoughSample->store($consultation, $request->file('audio'));

        AnalyseCough::dispatch($consultation->id, $capture->id);

        return response()->json([
            'status' => 'processing',
            'capture_id' => $capture->id,
        ], 202);
    }

    /**
     * Save captured patient media (camera).
     */
    public function capture(CaptureRequest $request, Consultation $consultation): JsonResponse
    {
        $file = $request->file('media');
        $type = $request->validated('type');

        $path = $file->store('captures', 'local');

        $capture = $consultation->captures()->create([
            'type' => $type,
            'path' => $path,
            'disk' => 'local',
            'mime_type' => (string) $file->getMimeType(),
            'captured_at' => now(),
        ]);

        return response()->json([
            'capture' => $capture->only(['id', 'type', 'path', 'mime_type']),
        ], 201);
    }

    /**
     * Download a captured media file.
     */
    public function captureDownload(Consultation $consultation, string $capture): StreamedResponse|JsonResponse
    {
        abort_unless(
            request()->user()?->id === $consultation->user_id || request()->user()?->isDoctor(),
            403,
        );

        $capture = $consultation->captures()->findOrFail($capture);

        abort_if(! Storage::disk($capture->disk)->exists($capture->path), 404);

        $this->auditLogger->record(
            AuditAction::CaptureDownloaded,
            actor: request()->user(),
            subject: $capture,
            context: ['consultation_id' => $consultation->id],
        );

        return Storage::disk($capture->disk)->download($capture->path);
    }

    /**
     * Mint a short-lived ephemeral token for the browser to open a direct
     * Live API WebSocket session with Gemini.
     */
    public function liveToken(Consultation $consultation): JsonResponse
    {
        $this->authorizeConsultation($consultation, $consultation->user);

        abort_unless($consultation->consented_at !== null, 403, 'Consent is required before a live voice session.');

        $key = (string) config('ai.providers.gemini.key');

        if ($key === '') {
            return response()->json(['error' => 'gemini_not_configured'], 503);
        }

        $expire = now()->addMinutes(30)->toIso8601String();
        $newSessionExpire = now()->addMinutes(1)->toIso8601String();

        try {
            $response = Http::withHeaders([
                'x-goog-api-key' => $key,
            ])->post('https://generativelanguage.googleapis.com/v1beta/auth_tokens', [
                'uses' => 1,
                'expireTime' => $expire,
                'newSessionExpireTime' => $newSessionExpire,
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json(['error' => 'token_provision_failed'], 503);
        }

        if ($response->failed()) {
            report($response->body());

            return response()->json(['error' => 'token_provision_failed'], 503);
        }

        $this->auditLogger->record(
            AuditAction::LiveSessionStarted,
            actor: $consultation->user,
            subject: $consultation,
            destination: 'gemini',
        );

        return response()->json([
            'token' => (string) $response->json('name'),
            'model' => (string) config('ai.live.model'),
            'language_code' => (string) config('ai.live.language'),
            'system_instruction' => $this->liveSystemInstruction($consultation),
        ]);
    }

    /**
     * Determine whether the agent called the start_cough_capture tool during this turn.
     *
     * @param  Collection<int, ToolCall>  $toolCalls
     */
    private function calledStartCoughCapture(Collection $toolCalls): bool
    {
        return $toolCalls->contains(fn (ToolCall $call): bool => $call->name === self::START_COUGH_CAPTURE_TOOL);
    }

    /**
     * The system instruction spoken format for a Live voice session. Shares the Sage persona and
     * interview flow with ConsultAgent::instructions() via basePersona() — only the tool-calling
     * paragraphs below differ, because the Live track additionally exposes recall_conversation_context
     * and end_consultation. Keep both in sync when editing the shared persona.
     */
    private function liveSystemInstruction(Consultation $consultation): string
    {
        return ConsultAgent::basePersona()."\n\n".implode("\n\n", [
            'If the patient refers to something from an earlier chat or voice session, or you need '
                .'to check whether a topic was already covered, you may call the recall_conversation_context '
                .'function, passing the topic as the query. Use it at most twice per session and only describe '
                .'facts the function actually returns; never invent earlier answers.',
            'When everything is covered, give a concise warm summary of reported symptoms and potential risk '
                .'factors. Do not add a disclaimer, warning, or care instruction before requesting the cough sample.',
            'Then announce exactly: "Please cough toward the microphone twice — recording starts now." Then '
                .'call the start_cough_capture function. The patient does not need any further recording '
                .'instructions: the UI records by itself and submits the sample for analysis. After the sample '
                .'is received, deliver one concise warm closing summary of what happens next, say goodbye, and '
                .'call the end_consultation function. End the session only via that function.',
        ]);
    }

    /**
     * Authorize the consultation against the requesting user.
     */
    private function authorizeConsultation(Consultation $consultation, ?User $user): void
    {
        if ($consultation->user_id !== ($user ?? request()->user())?->getAuthIdentifier()) {
            abort(403);
        }
    }

    /**
     * Build the consult agent starting a fresh conversation — every
     * session is its own pre-visit consultation, never a continuation.
     */
    private function agentFor(Consultation $consultation, ?User $user, bool $fresh = false): ConsultAgent
    {
        $user ??= request()->user();

        $agent = new ConsultAgent($user);

        if ($fresh || $consultation->agent_conversation_id === null) {
            $agent->forParticipant($user);
            $consultation->forceFill(['agent_conversation_id' => null])->save();
        } else {
            $agent->continue($consultation->agent_conversation_id, as: $user);
        }

        return $agent;
    }

    /**
     * Generate spoken narration for the reply text.
     */
    private function speak(string $text): ?string
    {
        try {
            $tts = Audio::of($text)
                ->voice('default-female')
                ->generate();

            return base64_encode($tts->audio);
        } catch (\Throwable $exception) {
            report($exception);

            return null;
        }
    }
}
