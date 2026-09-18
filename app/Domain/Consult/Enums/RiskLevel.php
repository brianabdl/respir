<?php

namespace App\Domain\Consult\Enums;

enum RiskLevel: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';
    case Unclear = 'unclear';

    public static function fromService(?string $value): self
    {
        return self::tryFrom((string) $value) ?? self::Unclear;
    }

    /**
     * Map a classifier score to a band. Cutoffs mirror the TB classifier
     * in ai-service (HIGH 0.66, MEDIUM 0.33) — keep them in sync.
     */
    public static function fromScore(float $score): self
    {
        if ($score >= 0.66) {
            return self::High;
        }

        if ($score >= 0.33) {
            return self::Medium;
        }

        return self::Low;
    }

    public function isUnclear(): bool
    {
        return $this === self::Unclear;
    }
}
