<?php

namespace App\Domain\Consult\Services;

use App\Models\Consultation;
use App\Models\User;

class BriefingPayloadBuilder
{
    /**
     * Build the de-identified briefing payload sent to the AI service.
     *
     * @return array<string, mixed>
     */
    public function build(Consultation $consultation): array
    {
        $subjectToken = "PATIENT_{$consultation->user_id}";

        return [
            'subject_token' => $subjectToken,
            'age' => null,
            'sex' => null,
            'risk_factors' => [],
            'transcript' => $this->transcript($consultation, $subjectToken),
            'cough' => $this->cough($consultation),
            'anemia' => $this->anemia($consultation),
        ];
    }

    /**
     * @return array<int, array{role: string, text: string}>
     */
    private function transcript(Consultation $consultation, string $subjectToken): array
    {
        $patient = $consultation->user;

        return $consultation->sessionLogs()
            ->orderBy('started_at')
            ->get()
            ->flatMap(fn ($log) => $log->turns ?? [])
            ->filter(fn (array $turn) => isset($turn['role'], $turn['text']))
            ->map(fn (array $turn) => [
                'role' => (string) $turn['role'],
                'text' => $this->scrub((string) $turn['text'], $patient, $subjectToken),
            ])
            ->take(600)
            ->values()
            ->all();
    }

    /**
     * Remove direct identifiers that must never reach an external model.
     */
    private function scrub(string $text, ?User $patient, string $subjectToken): string
    {
        if ($patient !== null) {
            $needles = array_filter([
                $patient->name,
                ...preg_split('/\s+/', (string) $patient->name, -1, PREG_SPLIT_NO_EMPTY) ?: [],
            ]);

            $text = str_ireplace(array_unique($needles), $subjectToken, $text);
        }

        return (string) preg_replace('/[\w.+-]+@[\w-]+\.[\w.-]+/', '[redacted]', $text);
    }

    /**
     * @return array<string, string>|null
     */
    private function cough(Consultation $consultation): ?array
    {
        if ($consultation->cough_analysis === null) {
            return null;
        }

        return [
            'risk_level' => (string) ($consultation->cough_risk ?? 'unclear'),
            'findings' => (string) ($consultation->cough_analysis['findings'] ?? ''),
            'recommendation' => (string) ($consultation->cough_analysis['recommendation'] ?? ''),
        ];
    }

    /**
     * @return array<int, array{part: string, risk_level: string, risk_score: float|null, findings: string}>
     */
    private function anemia(Consultation $consultation): array
    {
        return $consultation->captures()
            ->whereIn('type', ['palm', 'eye', 'nail'])
            ->whereNotNull('analysis')
            ->orderBy('captured_at')
            ->get()
            ->map(fn ($capture) => [
                'part' => (string) $capture->type,
                'risk_level' => (string) ($capture->risk_level ?? 'unclear'),
                'risk_score' => isset($capture->analysis['risk_score'])
                    ? (float) $capture->analysis['risk_score']
                    : null,
                'findings' => (string) ($capture->analysis['findings'] ?? ''),
            ])
            ->values()
            ->all();
    }
}
