<?php

namespace App\Http\Controllers\Consult;

use App\Ai\Agents\ConsultAgent;
use App\Ai\Agents\CoughAnalysisAgent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Consult\CaptureRequest;
use App\Http\Requests\Consult\ChatMessageRequest;
use App\Http\Requests\Consult\CoughSampleRequest;
use App\Http\Requests\Consult\VoiceRequest;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;
use Laravel\Ai\Audio;
use Laravel\Ai\Files\Base64Audio;
use Laravel\Ai\Responses\StructuredAgentResponse;
use Laravel\Ai\Streaming\Events\StreamEnd;
use Laravel\Ai\Streaming\Events\TextDelta;
use Laravel\Ai\Transcription;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ConsultationController extends Controller
{
    /**
     * Show the consult page for a user, creating a consultation on first use.
     */
    public function index(): Response
    {
        $consultation = $this->currentConsultation();

        return inertia('consult', [
            'consultation' => $consultation->only(['id', 'status', 'report', 'cough_analysis', 'cough_risk']),
            'captures' => $consultation->captures()->get(['id', 'type', 'path', 'mime_type']),
        ]);
    }

    /**
     * Start a new consultation.
     */
    public function store(): RedirectResponse
    {
        $consultation = $this->currentConsultation();

        return redirect()->route('consult', $consultation);
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
        $file = $request->file('audio');
        $message = $request->validated('message');
        $internalInstruction = false;
        $greetingTurn = $file === null && $message === null;

        if ($greetingTurn) {
            $message = 'Greet the patient for the first time like an extroverted, warm and friendly '
                .'intake nurse. Introduce yourself as Sage, ask how they are doing today, then ask '
                .'their name as the first step of the pre-visit interview.';
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

        return response()->json([
            'transcript' => $internalInstruction ? null : (string) $message,
            'reply' => $reply,
            'audio' => $this->speak($reply),
            'mime' => 'audio/wav',
            'request_cough' => str_contains($reply, "I'm ready to record"),
        ]);
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

        $log = $consultation->sessionLogs()->firstOrNew([
            'agent_conversation_id' => $validated['session_id'],
        ]);

        $log->forceFill([
            'agent_conversation_id' => $validated['session_id'],
            'turns' => array_map(fn (array $turn): array => [
                'role' => $turn['role'],
                'text' => $turn['text'],
            ], $validated['turns']),
            'started_at' => $log->exists ? $log->started_at : ($validated['started_at'] ?? now()),
            'ended_at' => ($validated['ended'] ?? false) ? now() : null,
        ])->save();

        return response()->json(['saved' => true], 201);
    }

    /**
     * Save the recorded cough sample and analyse it.
     */
    public function cough(CoughSampleRequest $request, Consultation $consultation): JsonResponse
    {
        $file = $request->file('audio');

        $path = $file->store('captures', 'local');

        $consultation->captures()->create([
            'type' => 'audio',
            'path' => $path,
            'disk' => 'local',
            'mime_type' => (string) $file->getMimeType(),
            'captured_at' => now(),
        ]);

        $analysis = $this->runCoughAnalysis($consultation, $file);

        $consultation->forceFill([
            'cough_analysis' => $analysis,
            'cough_risk' => $analysis['risk_level'] ?? null,
        ])->save();

        $consultation->refresh();

        return response()->json([
            'cough_analysis' => $consultation->cough_analysis,
            'cough_risk' => $consultation->cough_risk,
        ]);
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
        $capture = $consultation->captures()->findOrFail($capture);

        abort_if(! Storage::disk($capture->disk)->exists($capture->path), 404);

        return Storage::disk($capture->disk)->download($capture->path);
    }

    /**
     * Mint a short-lived ephemeral token for the browser to open a direct
     * Live API WebSocket session with Gemini.
     */
    public function liveToken(Consultation $consultation): JsonResponse
    {
        $this->authorizeConsultation($consultation, $consultation->user);

        $key = (string) config('ai.providers.gemini.key');

        if ($key === '') {
            return response()->json(['error' => 'gemini_not_configured'], 503);
        }

        $expire = now()->addMinutes(30)->toIso8601String();
        $newSessionExpire = now()->addMinutes(1)->toIso8601String();

        try {
            $response = Http::withHeaders([
                'x-goog-api-key' => $key,
            ])->post('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', [
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

        return response()->json([
            'token' => (string) $response->json('name'),
            'model' => (string) config('ai.live.model', 'models/gemini-2.0-flash-live-001'),
            'system_instruction' => $this->liveSystemInstruction($consultation),
        ]);
    }

    /**
     * The system instruction spoken format for a Live voice session.
     */
    private function liveSystemInstruction(Consultation $consultation): string
    {
        return implode("\n", [
            'You are "Sage", an extroverted, warm and chatty pre-visit triage assistant for a primary-care '
                .'clinic. Talk like a friendly receptionist: short sentences of two to four, plain speech, '
                .'no lists, no markdown, no special characters. Your voice is synthesised. You are NOT a '
                .'doctor and never give a definitive diagnosis.',
            'FIRST TURN (mandatory): greet the patient like an extroverted intake nurse. Introduce yourself '
                .'as Sage, ask how they are doing today, then ask their name.',
            'After learning their name, weave it naturally into conversation, then gather one thing at a '
                .'time: how they feel; fever, night sweats, unexplained weight loss, fatigue; cough and how '
                .'long it has lasted, sputum, coughing up blood, chest pain, breathlessness; close contact '
                .'with tuberculosis patients, previous TB, immunosuppression or HIV status, smoking.',
            'When everything is covered, give a warm summary of symptoms and risk factors and remind the '
                .'patient that only a doctor can diagnose anything.',
            'Then say exactly: "I\'m ready to record. Please cough toward the microphone twice."',
        ]);
    }

    /**
     * Get or create the user's in-progress consultation.
     */
    private function currentConsultation(): Consultation
    {
        $user = request()->user();

        $consultation = $user->consultations()->where('status', 'chatting')->latest()->first();

        return $consultation ?? $user->consultations()->create();
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

    /**
     * Run the structured cough analysis against the uploaded file.
     *
     * @return array{risk_level?: string, findings?: string, recommendation?: string}
     */
    private function runCoughAnalysis(Consultation $consultation, UploadedFile $file): array
    {
        try {
            $response = CoughAnalysisAgent::make()->prompt(
                'Analyse this patient cough recording.',
                attachments: [Base64Audio::fromUpload($file)],
            );

            return $response instanceof StructuredAgentResponse
                ? $response->structured
                : [];
        } catch (\Throwable $exception) {
            report($exception);

            return [
                'risk_level' => 'unclear',
                'findings' => 'The cough sample could not be analysed.',
                'recommendation' => 'Please try recording again, or discuss your cough with the doctor in person.',
            ];
        }
    }
}
