<?php

namespace App\Domain\Consult\DTOs;

use App\Domain\Consult\Enums\RiskLevel;

final readonly class CoughAnalysisResult
{
    /**
     * @param  array<int, float>  $embedding
     * @param  array<string, mixed>  $model
     */
    public function __construct(
        public RiskLevel $riskLevel,
        public ?float $riskScore,
        public string $findings,
        public string $recommendation,
        public array $embedding,
        public array $model,
        public float $durationSeconds,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function fromServicePayload(array $payload): self
    {
        return new self(
            riskLevel: RiskLevel::fromService($payload['risk_level'] ?? null),
            riskScore: isset($payload['risk_score']) ? (float) $payload['risk_score'] : null,
            findings: (string) ($payload['findings'] ?? ''),
            recommendation: (string) ($payload['recommendation'] ?? ''),
            embedding: array_map('floatval', $payload['embedding'] ?? []),
            model: is_array($payload['model'] ?? null) ? $payload['model'] : [],
            durationSeconds: (float) ($payload['duration_s'] ?? 0.0),
        );
    }

    /**
     * @param  array{risk_level?: string, findings?: string, recommendation?: string}  $analysis
     */
    public static function unanalysed(array $analysis): self
    {
        return new self(
            riskLevel: RiskLevel::Unclear,
            riskScore: null,
            findings: (string) ($analysis['findings'] ?? 'The cough sample could not be analysed.'),
            recommendation: (string) ($analysis['recommendation'] ?? 'Please try recording again, or discuss your cough with the doctor in person.'),
            embedding: [],
            model: [],
            durationSeconds: 0.0,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'risk_level' => $this->riskLevel->value,
            'risk_score' => $this->riskScore,
            'findings' => $this->findings,
            'recommendation' => $this->recommendation,
            'model' => $this->model,
            'duration_s' => $this->durationSeconds,
        ];
    }
}
