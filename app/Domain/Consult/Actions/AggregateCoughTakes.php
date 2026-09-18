<?php

namespace App\Domain\Consult\Actions;

use App\Domain\Consult\DTOs\CoughAnalysisResult;
use App\Domain\Consult\Enums\RiskLevel;
use App\Models\Consultation;
use App\Models\ConsultCapture;

class AggregateCoughTakes
{
    /** Rolling window: median over at most this many recent scored takes. */
    public const WINDOW = 3;

    /**
     * Aggregate the latest scored takes into one stable result.
     *
     * A single take (or no scored takes at all) passes through unchanged,
     * so the first recording behaves exactly as before and only repeated
     * takes engage the median. Unclear takes carry no score and never move
     * the median; the representative take — closest score to the median,
     * newest on ties — supplies the human-readable findings.
     */
    public function forConsultation(Consultation $consultation, CoughAnalysisResult $latest): CoughAnalysisResult
    {
        $takes = $consultation->captures()
            ->where('type', 'audio')
            ->whereNotNull('analysis')
            ->latest('id')
            ->limit(self::WINDOW)
            ->get();

        $scored = $takes
            ->filter(fn (ConsultCapture $capture): bool => is_numeric($capture->analysis['risk_score'] ?? null))
            ->values();

        if ($scored->count() <= 1) {
            return $latest;
        }

        $scores = $scored
            ->map(fn (ConsultCapture $capture): float => (float) $capture->analysis['risk_score'])
            ->sort()
            ->values();
        $count = $scores->count();
        $median = $count % 2 === 1
            ? $scores->get(intdiv($count, 2))
            : ($scores->get(intdiv($count, 2) - 1) + $scores->get(intdiv($count, 2))) / 2;
        $median = round($median, 4);

        $representative = $scored
            ->sort(fn (ConsultCapture $a, ConsultCapture $b): int => [
                abs((float) $a->analysis['risk_score'] - $median), -$a->getKey(),
            ] <=> [
                abs((float) $b->analysis['risk_score'] - $median), -$b->getKey(),
            ])
            ->first();
        $analysis = $representative->analysis;

        return new CoughAnalysisResult(
            riskLevel: RiskLevel::fromScore($median),
            riskScore: $median,
            findings: (string) ($analysis['findings'] ?? $latest->findings),
            recommendation: (string) ($analysis['recommendation'] ?? $latest->recommendation),
            embedding: $latest->embedding,
            model: is_array($analysis['model'] ?? null) ? $analysis['model'] : $latest->model,
            durationSeconds: (float) ($analysis['duration_s'] ?? $latest->durationSeconds),
        );
    }
}
