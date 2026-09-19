<?php

namespace App\Domain\Consult\Actions;

use App\Domain\Consult\Enums\ConsultationStatus;
use App\Models\Consultation;
use App\Models\User;

class StartConsultation
{
    /**
     * Get the user's in-progress consultation, creating one on first use.
     *
     * A latest visit that already produced an analysis or was reviewed is
     * considered finished: it is closed as completed and a fresh chatting
     * visit starts, so the patient history keeps one row per visit instead
     * of collapsing everything into a single eternal consultation.
     */
    public function forUser(User $user): Consultation
    {
        $latest = $user->consultations()->latest()->first();

        if ($latest !== null && $this->isResumable($latest)) {
            return $latest;
        }

        if ($latest !== null && $latest->status !== ConsultationStatus::Completed->value) {
            $latest->forceFill(['status' => ConsultationStatus::Completed->value])->save();
        }

        return $user->consultations()->create([
            'status' => ConsultationStatus::Chatting->value,
        ]);
    }

    private function isResumable(Consultation $consultation): bool
    {
        return $consultation->status === ConsultationStatus::Chatting->value
            && ! $consultation->is_reviewed
            && $consultation->cough_analysis === null;
    }
}
