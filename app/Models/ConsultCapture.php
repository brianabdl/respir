<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $consultation_id
 * @property string $type
 * @property string $path
 * @property string $disk
 * @property string $mime_type
 * @property array<string, mixed>|null $analysis
 * @property string|null $risk_level
 * @property Carbon|null $analyzed_at
 * @property Carbon $captured_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Consultation $consultation
 */
#[Fillable(['type', 'path', 'disk', 'mime_type', 'captured_at'])]
class ConsultCapture extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'analysis' => 'array',
            'analyzed_at' => 'datetime',
        ];
    }

    /**
     * The consultation this capture belongs to.
     *
     * @return BelongsTo<Consultation, $this>
     */
    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }
}
