<?php

namespace App\Domain\Consult\Actions;

use App\Domain\Consult\Enums\ConsultationStatus;
use App\Models\Consultation;
use App\Models\User;

class StartConsultation
{
    /**
     * Get the user's in-progress consultation, creating one on first use.
     */
    public function forUser(User $user): Consultation
    {
        return $user->consultations()
            ->where('status', ConsultationStatus::Chatting->value)
            ->latest()
            ->first()
            ?? $user->consultations()->create([
                'status' => ConsultationStatus::Chatting->value,
            ]);
    }
}
