<?php

namespace App\Http\Controllers\Doctor;

use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Enums\AuditAction;
use App\Domain\Consult\Actions\FindSimilarCoughs;
use App\Domain\Consult\Actions\QueueSummary;
use App\Domain\Consult\Jobs\GenerateClinicianBriefing;
use App\Http\Controllers\Controller;
use App\Models\Consultation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Response;

class ConsultationReviewController extends Controller
{
    public function __construct(private AuditLogger $auditLogger, private QueueSummary $queueSummary) {}

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
            ->withCount('captures')
            ->latest()
            ->paginate(15)
            ->through(fn (Consultation $consultation) => [
                'id' => $consultation->id,
                'patient' => $consultation->user->only(['id', 'name', 'email']),
                'status' => $consultation->status,
                'cough_risk' => $consultation->cough_risk,
                'has_briefing' => $consultation->report !== null,
                'is_reviewed' => $consultation->is_reviewed,
                'captures_count' => $consultation->captures_count,
                'created_at' => $consultation->created_at->toDateTimeString(),
                'updated_at' => $consultation->updated_at->toDateTimeString(),
                'sessions' => $consultation->sessionLogs->map(fn ($log) => [
                    'id' => $log->id,
                    'started_at' => $log->started_at?->toDateTimeString(),
                    'ended_at' => $log->ended_at?->toDateTimeString(),
                    'turn_count' => count($log->turns ?? []),
                ]),
            ]);

        return inertia('doctor/index', [
            'consultations' => $consultations,
            'summary' => $this->queueSummary->get(),
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
                'clinical_notes' => $consultation->clinical_notes,
                'follow_up_actions' => $consultation->follow_up_actions ?? [],
                'is_reviewed' => $consultation->is_reviewed,
                'reviewed_at' => $consultation->reviewed_at?->toDateTimeString(),
                'reviewer' => $consultation->reviewer?->only(['id', 'name']),
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
                        ...$capture->only(['id', 'type', 'mime_type']),
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

    /**
     * Save clinical notes and follow-up actions.
     */
    public function saveNotes(Request $request, Consultation $consultation): JsonResponse
    {
        $validated = $request->validate([
            'clinical_notes' => ['nullable', 'string', 'max:10000'],
            'follow_up_actions' => ['nullable', 'array'],
            'follow_up_actions.*' => ['string'],
        ]);

        $consultation->update([
            'clinical_notes' => $validated['clinical_notes'] ?? null,
            'follow_up_actions' => $validated['follow_up_actions'] ?? null,
        ]);

        $this->auditLogger->record(
            AuditAction::ConsultationUpdated,
            actor: $request->user(),
            subject: $consultation,
            context: ['action' => 'notes_saved'],
        );

        return response()->json([
            'success' => true,
            'message' => 'Clinical notes saved successfully',
        ]);
    }

    /**
     * Mark consultation as reviewed by current doctor.
     */
    public function markReviewed(Request $request, Consultation $consultation): JsonResponse
    {
        $consultation->update([
            'is_reviewed' => true,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        $this->auditLogger->record(
            AuditAction::ConsultationReviewed,
            actor: $request->user(),
            subject: $consultation,
        );

        return response()->json([
            'success' => true,
            'message' => 'Consultation marked as reviewed',
            'reviewed_at' => $consultation->reviewed_at?->toIso8601String(),
        ]);
    }
}
