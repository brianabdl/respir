<?php

namespace App\Http\Controllers;

use App\Domain\Consult\Actions\QueueSummary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private QueueSummary $queueSummary) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        if ($user->isDoctor()) {
            return inertia('dashboard', [
                'view' => 'doctor',
                'summary' => $this->queueSummary->get(),
            ]);
        }

        $consultations = $user->consultations()
            ->with(['reviewer:id,name', 'captures' => fn ($query) => $query
                ->where('type', 'audio')
                ->latest('id')
                ->limit(1),
            ])
            ->latest()
            ->limit(20)
            ->get()
            ->map(function ($consultation) {
                $audio = $consultation->captures->first();

                return $consultation->only([
                    'id', 'status', 'cough_risk', 'cough_analysis', 'follow_up_actions',
                    'consented_at', 'created_at', 'updated_at',
                ]) + [
                    'has_briefing' => $consultation->report !== null,
                    'is_reviewed' => $consultation->is_reviewed,
                    'reviewed_at' => $consultation->reviewed_at?->toDateTimeString(),
                    'reviewer_name' => $consultation->reviewer?->name,
                    // Doctor's private clinical_notes stay doctor-only; the
                    // follow-up actions above are the patient-facing part.
                    'audio_download' => $audio ? URL::temporarySignedRoute(
                        'consult.captures.download',
                        now()->addMinutes(30),
                        ['consultation' => $consultation->id, 'capture' => $audio->id],
                    ) : null,
                ];
            });

        return inertia('dashboard', [
            'view' => 'patient',
            'consultations' => $consultations,
        ]);
    }
}
