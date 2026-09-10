<?php

namespace App\Domain\Consult\DTOs;

use App\Domain\Consult\Enums\RiskLevel;

final readonly class AnemiaAnalysisResult
{
    /**
     * @param  array<string, mixed>  $model
     */
    public function __construct(
        public string $part,
        public RiskLevel $riskLevel,
        public ?float $riskScore,
        public string $prediction,
        public ?float $threshold,
        public string $findings,
        public string $recommendation,
        public array $model,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function fromServicePayload(array $payload): self
    {
        return new self(
            part: (string) ($payload['part'] ?? 'palm'),
            riskLevel: RiskLevel::fromService($payload['risk_level'] ?? null),
            riskScore: isset($payload['risk_score']) ? (float) $payload['risk_score'] : null,
            prediction: (string) ($payload['prediction'] ?? 'Unknown'),
            threshold: isset($payload['threshold']) ? (float) $payload['threshold'] : null,
            findings: (string) ($payload['findings'] ?? ''),
            recommendation: (string) ($payload['recommendation'] ?? ''),
            model: is_array($payload['model'] ?? null) ? $payload['model'] : [],
        );
    }

    /**
     * @param  array<string, mixed>  $analysis
     */
    public static function unanalysed(string $part, array $analysis = []): self
    {
        return new self(
            part: $part,
            riskLevel: RiskLevel::Unclear,
            riskScore: null,
            prediction: 'Unknown',
            threshold: null,
            findings: (string) ($analysis['findings'] ?? 'The image could not be analysed.'),
            recommendation: (string) ($analysis['recommendation'] ?? 'Try capturing the image again in bright, even light, and discuss the result with the doctor.'),
            model: [],
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'part' => $this->part,
            'risk_level' => $this->riskLevel->value,
            'risk_score' => $this->riskScore,
            'prediction' => $this->prediction,
            'threshold' => $this->threshold,
            'findings' => $this->findings,
            'recommendation' => $this->recommendation,
            'model' => $this->model,
        ];
    }
}
