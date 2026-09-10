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

    public function isUnclear(): bool
    {
        return $this === self::Unclear;
    }
}
