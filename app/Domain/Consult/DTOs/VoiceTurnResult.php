<?php

namespace App\Domain\Consult\DTOs;

final readonly class VoiceTurnResult
{
    public function __construct(
        public ?string $transcript,
        public ?string $reply,
        public ?string $audio,
        public ?string $mime,
        public bool $requestCough,
        public ?string $error = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'transcript' => $this->transcript,
            'reply' => $this->reply,
            'audio' => $this->audio,
            'mime' => $this->mime,
            'request_cough' => $this->requestCough,
            'error' => $this->error,
        ];
    }
}
