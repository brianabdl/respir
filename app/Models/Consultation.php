<?php

namespace App\Models;

use Database\Factories\ConsultationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Laravel\Ai\Concerns\HasConversations;
use Laravel\Ai\Models\Conversation;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $agent_conversation_id
 * @property string $status
 * @property array<string, mixed>|null $report
 * @property array<string, mixed>|null $cough_analysis
 * @property string|null $cough_risk
 * @property Carbon|null $consented_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read Collection<int, ConsultCapture> $captures
 * @property-read Collection<int, Conversation> $conversations
 */
#[Fillable(['status'])]
class Consultation extends Model
{
    /** @use HasFactory<ConsultationFactory> */
    use HasConversations, HasFactory;

    protected function casts(): array
    {
        return [
            'report' => 'array',
            'cough_analysis' => 'array',
            'consented_at' => 'datetime',
        ];
    }

    /**
     * The owner of this consultation.
     */
    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Media captured during this consultation.
     *
     * @return HasMany<ConsultCapture, $this>
     */
    public function captures(): HasMany
    {
        return $this->hasMany(ConsultCapture::class);
    }

    /**
     * Persistent session logs (transcripts) for this consultation.
     *
     * @return HasMany<ConsultSessionLog, $this>
     */
    public function sessionLogs(): HasMany
    {
        return $this->hasMany(ConsultSessionLog::class);
    }
}
