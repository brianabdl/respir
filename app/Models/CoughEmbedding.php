<?php

namespace App\Models;

use Database\Factories\CoughEmbeddingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $consultation_id
 * @property int|null $capture_id
 * @property array<int, float> $embedding
 * @property string|null $risk_level
 * @property string|null $model
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Consultation $consultation
 * @property-read ConsultCapture|null $capture
 */
#[Fillable(['consultation_id', 'capture_id', 'embedding', 'risk_level', 'model'])]
class CoughEmbedding extends Model
{
    /** @use HasFactory<CoughEmbeddingFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'embedding' => 'array',
        ];
    }

    /**
     * The consultation this embedding belongs to.
     *
     * @return BelongsTo<Consultation, $this>
     */
    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    /**
     * The capture this embedding was extracted from.
     *
     * @return BelongsTo<ConsultCapture, $this>
     */
    public function capture(): BelongsTo
    {
        return $this->belongsTo(ConsultCapture::class);
    }
}
