<?php

namespace App\Http\Controllers\Doctor;

use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Enums\AuditAction;
use App\Domain\Consult\Actions\FindSimilarCoughs;
use App\Domain\Consult\Jobs\GenerateClinicianBriefing;
use App\Http\Controllers\Controller;
use App\Models\Consultation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Response;

class ConsultationReviewController extends Controller
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * List every patient consultation for the reviewing doctor.
     */
    public function index(Request $request): Response
    {
        $this->auditLogger->record(
            AuditAction::ConsultationListViewed,
            actor: $request->user(),
        );

        $consultations = Consultation::query()
            ->with(['user:id,name,email', 'sessionLogs'])
            ->latest()
            ->paginate(15)
            ->through(fn (Consultation $consultation) => [
                'id' => $consultation->id,
                'patient' => $consultation->user->only(['id', 'name', 'email']),
                'status' => $consultation->status,
                'cough_risk' => $consultation->cough_risk,
                'created_at' => $consultation->created_at->toDateTimeString(),
                'sessions' => $consultation->sessionLogs->map(fn ($log) => [
                    'id' => $log->id,
                    'started_at' => $log->started_at?->toDateTimeString(),
                    'ended_at' => $log->ended_at?->toDateTimeString(),
                    'turn_count' => count($log->turns ?? []),
                ]),
            ]);

        return inertia('doctor/index', [
            'consultations' => $consultations,
        ]);
    }

    /**
     * A consultation's full history: session transcripts, captures and coughs.
     */
    public function show(Request $request, Consultation $consultation): Response
    {
        $this->auditLogger->record(
            AuditAction::ConsultationViewed,
            actor: $request->user(),
            subject: $consultation,
        );

        return inertia('doctor/show', [
            'consultation' => [
                'id' => $consultation->id,
                'patient' => $consultation->user->only(['id', 'name', 'email']),
                'status' => $consultation->status,
                'cough_risk' => $consultation->cough_risk,
                'report' => $consultation->report,
                'cough_analysis' => $consultation->cough_analysis,
                'created_at' => $consultation->created_at->toDateTimeString(),
                'sessions' => $consultation->sessionLogs()
                    ->orderBy('started_at')
                    ->get()
                    ->map(fn ($log) => [
                        'id' => $log->id,
                        'started_at' => $log->started_at?->toDateTimeString(),
                        'ended_at' => $log->ended_at?->toDateTimeString(),
                        'turns' => $log->turns ?? [],
                    ]),
                'captures' => $consultation->captures()
                    ->orderBy('captured_at')
                    ->get()
                    ->map(fn ($capture) => [
                        ...$capture->only(['id', 'type', 'mime_type', 'analysis', 'risk_level']),
                        'analyzed_at' => $capture->analyzed_at?->toDateTimeString(),
                        'captured_at' => $capture->captured_at->toDateTimeString(),
                        'download' => URL::temporarySignedRoute(
                            'consult.captures.download',
                            now()->addMinutes(30),
                            [
                                'consultation' => $consultation->id,
                                'capture' => $capture->id,
                            ],
                        ),
                    ]),
            ],
        ]);
    }

    /**
     * Queue (re)generation of the clinician briefing for a consultation.
     */
    public function briefing(Request $request, Consultation $consultation): JsonResponse
    {
        $this->auditLogger->record(
            AuditAction::BriefingRequested,
            actor: $request->user(),
            subject: $consultation,
            destination: 'ai-service',
        );

        GenerateClinicianBriefing::dispatch($consultation->id);

        return response()->json(['status' => 'processing'], 202);
    }

    /**
     * List coughs acoustically similar to this consultation's sample.
     */
    public function similar(Consultation $consultation, FindSimilarCoughs $findSimilarCoughs): JsonResponse
    {
        return response()->json([
            'similar' => $findSimilarCoughs->forConsultation($consultation),
        ]);
    }
}
