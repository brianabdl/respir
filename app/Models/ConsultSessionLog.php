<?php

namespace App\Models;

use Database\Factories\ConsultSessionLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $consultation_id
 * @property string|null $agent_conversation_id
 * @property array<int, array{role?: string, text?: string, content?: mixed, at?: string}>|null $turns
 * @property Carbon|null $started_at
 * @property Carbon|null $ended_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Consultation $consultation
 */
#[Fillable(['agent_conversation_id', 'turns', 'started_at', 'ended_at'])]
class ConsultSessionLog extends Model
{
    /** @use HasFactory<ConsultSessionLogFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'turns' => 'array',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /**
     * The consultation this log belongs to.
     *
     * @return BelongsTo<Consultation, $this>
     */
    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }
}
