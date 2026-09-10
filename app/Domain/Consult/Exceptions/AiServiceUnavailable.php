<?php

namespace App\Domain\Consult\Exceptions;

use RuntimeException;

class AiServiceUnavailable extends RuntimeException
{
    public static function forOperation(string $operation, int $status): self
    {
        return new self("The AI service failed during {$operation} (HTTP {$status}).");
    }
}
