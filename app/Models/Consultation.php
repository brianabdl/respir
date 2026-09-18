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
 * @property string|null $clinical_notes
 * @property array<string>|null $follow_up_actions
 * @property bool $is_reviewed
 * @property Carbon|null $reviewed_at
 * @property int|null $reviewed_by
 * @property Carbon|null $consented_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read User|null $reviewer
 * @property-read Collection<int, ConsultCapture> $captures
 * @property-read Collection<int, Conversation> $conversations
 * @property-read int $captures_count
 */
#[Fillable(['status', 'clinical_notes', 'follow_up_actions', 'is_reviewed', 'reviewed_at', 'reviewed_by'])]
class Consultation extends Model
{
    /** @use HasFactory<ConsultationFactory> */
    use HasConversations, HasFactory;

    protected function casts(): array
    {
        return [
            'report' => 'array',
            'cough_analysis' => 'array',
            'follow_up_actions' => 'array',
            'is_reviewed' => 'boolean',
            'consented_at' => 'datetime',
            'reviewed_at' => 'datetime',
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
     * The doctor who reviewed this consultation.
     */
    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
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
