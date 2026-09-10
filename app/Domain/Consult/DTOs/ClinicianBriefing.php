<?php

namespace App\Domain\Consult\DTOs;

final readonly class ClinicianBriefing
{
    /**
     * @param  array<int, string>  $riskFactors
     * @param  array<int, string>  $suggestedQuestions
     * @param  array<int, string>  $redFlags
     */
    public function __construct(
        public string $chiefComplaint,
        public string $history,
        public array $riskFactors,
        public string $coughFindings,
        public string $anemiaFindings,
        public array $suggestedQuestions,
        public array $redFlags,
        public string $disclaimer,
        public bool $degraded,
        public string $generatedBy,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function fromServicePayload(array $payload): self
    {
        return new self(
            chiefComplaint: (string) ($payload['chief_complaint'] ?? ''),
            history: (string) ($payload['history'] ?? ''),
            riskFactors: array_values(array_map('strval', $payload['risk_factors'] ?? [])),
            coughFindings: (string) ($payload['cough_findings'] ?? ''),
            anemiaFindings: (string) ($payload['anemia_findings'] ?? ''),
            suggestedQuestions: array_values(array_map('strval', $payload['suggested_questions'] ?? [])),
            redFlags: array_values(array_map('strval', $payload['red_flags'] ?? [])),
            disclaimer: (string) ($payload['disclaimer'] ?? ''),
            degraded: (bool) ($payload['degraded'] ?? false),
            generatedBy: (string) ($payload['generated_by'] ?? 'unknown'),
        );
    }

    public static function unavailable(): self
    {
        return new self(
            chiefComplaint: '',
            history: 'The automated briefing could not be generated because the AI service was unavailable.',
            riskFactors: [],
            coughFindings: '',
            anemiaFindings: '',
            suggestedQuestions: [],
            redFlags: [],
            disclaimer: 'This consultation still requires an in-person clinical assessment.',
            degraded: true,
            generatedBy: 'laravel-fallback',
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'chief_complaint' => $this->chiefComplaint,
            'history' => $this->history,
            'risk_factors' => $this->riskFactors,
            'cough_findings' => $this->coughFindings,
            'anemia_findings' => $this->anemiaFindings,
            'suggested_questions' => $this->suggestedQuestions,
            'red_flags' => $this->redFlags,
            'disclaimer' => $this->disclaimer,
            'degraded' => $this->degraded,
            'generated_by' => $this->generatedBy,
        ];
    }
}
