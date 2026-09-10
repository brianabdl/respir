<?php

namespace App\Domain\Audit;

use App\Domain\Audit\Enums\AuditAction;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLogger
{
    /**
     * Record a patient-data access or external AI call. Never store clinical content.
     *
     * @param  array<string, mixed>  $context
     */
    public function record(
        AuditAction $action,
        ?Model $actor = null,
        ?Model $subject = null,
        ?string $destination = null,
        array $context = [],
    ): AuditLog {
        return AuditLog::create([
            'actor_id' => $actor?->getKey(),
            'action' => $action->value,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'destination' => $destination,
            'context' => $context,
            'ip_address' => request()->ip(),
            'user_agent' => Str::limit((string) request()->userAgent(), 255, ''),
        ]);
    }
}
