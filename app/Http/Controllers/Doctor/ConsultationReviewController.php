<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use Inertia\Response;

class ConsultationReviewController extends Controller
{
    /**
     * List every patient consultation for the reviewing doctor.
     */
    public function index(): Response
    {
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
    public function show(Consultation $consultation): Response
    {
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
                'captures' => $consultation->captures()->get()->map(fn ($capture) => [
                    ...$capture->only(['id', 'type', 'mime_type']),
                    'download' => route('consult.captures.download', [
                        'consultation' => $consultation->id,
                        'capture' => $capture->id,
                    ]),
                ]),
            ],
        ]);
    }
}
