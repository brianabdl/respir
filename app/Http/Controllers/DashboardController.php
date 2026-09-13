<?php

namespace App\Http\Controllers;

use App\Domain\Consult\Actions\QueueSummary;
use Illuminate\Http\Request;
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

        $consultation = $user->consultations()->latest()->first();

        return inertia('dashboard', [
            'view' => 'patient',
            'consultation' => $consultation ? $consultation->only([
                'id', 'status', 'cough_risk', 'consented_at', 'created_at', 'updated_at',
            ]) + ['has_briefing' => $consultation->report !== null] : null,
        ]);
    }
}
