<?php

namespace App\Domain\Consult\DTOs;

final readonly class TranscriptTurn
{
    public function __construct(
        public string $role,
        public string $text,
    ) {}

    /**
     * @param  array<string, mixed>  $turn
     */
    public static function fromArray(array $turn): self
    {
        return new self(
            role: (string) ($turn['role'] ?? 'user'),
            text: (string) ($turn['text'] ?? ''),
        );
    }

    /**
     * @return array{role: string, text: string}
     */
    public function toArray(): array
    {
        return [
            'role' => $this->role,
            'text' => $this->text,
        ];
    }
}
