<?php

namespace App\Domain\Consult\Actions;

use App\Models\Consultation;
use App\Models\CoughEmbedding;

class FindSimilarCoughs
{
    /**
     * Find the most acoustically similar cough embeddings from other consultations.
     *
     * @return array<int, array{consultation_id: int, patient: string, risk_level: string|null, distance: float}>
     */
    public function forConsultation(Consultation $consultation, int $limit = 5): array
    {
        $source = CoughEmbedding::query()
            ->where('consultation_id', $consultation->id)
            ->latest('id')
            ->first();

        if ($source === null || $source->embedding === []) {
            return [];
        }

        $vector = '['.implode(',', array_map(
            fn (float $value): string => sprintf('%.8F', $value),
            $source->embedding,
        )).']';

        return CoughEmbedding::query()
            ->selectRaw('cough_embeddings.*, embedding <=> ? as distance', [$vector])
            ->where('consultation_id', '!=', $consultation->id)
            ->with('consultation.user:id,name')
            ->orderBy('distance')
            ->limit($limit)
            ->get()
            ->map(fn (CoughEmbedding $embedding): array => [
                'consultation_id' => $embedding->consultation_id,
                'patient' => $embedding->consultation->user->name,
                'risk_level' => $embedding->risk_level,
                'distance' => round((float) $embedding->getAttribute('distance'), 4),
            ])
            ->values()
            ->all();
    }
}
