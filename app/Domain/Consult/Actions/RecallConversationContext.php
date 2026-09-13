<?php

namespace App\Domain\Consult\Actions;

use App\Domain\Consult\DTOs\TranscriptTurn;
use App\Models\Consultation;
use App\Models\ConsultSessionLog;
use Laravel\Ai\Models\ConversationMessage;

class RecallConversationContext
{
    private const MAX_TURNS = 24;

    private const MAX_TERMS = 8;

    private const MAX_TEXT_LENGTH = 600;

    /**
     * Gather prior patient-stated conversation for this consultation. Only
     * spoken/typed turns are returned — never stored clinical analysis.
     *
     * @return array{found: int, turns: array<int, array{role: string, text: string}>}
     */
    public function forConsultation(Consultation $consultation, string $query): array
    {
        $terms = $this->terms($query);

        $turns = collect($this->sessionTurns($consultation))
            ->concat($this->chatTurns($consultation))
            ->filter(fn (array $turn): bool => $terms === [] || $this->matches($turn, $terms))
            ->map(fn (array $turn): array => [
                'role' => $turn['role'],
                'text' => mb_strimwidth($turn['text'], 0, self::MAX_TEXT_LENGTH, '…'),
            ])
            ->take(self::MAX_TURNS)
            ->values()
            ->all();

        return [
            'found' => count($turns),
            'turns' => $turns,
        ];
    }

    /**
     * Turns from previously recorded voice sessions, newest session first.
     *
     * @return array<int, array{role: string, text: string}>
     */
    private function sessionTurns(Consultation $consultation): array
    {
        $turns = [];

        $consultation->sessionLogs()
            ->orderByDesc('started_at')
            ->get()
            ->each(function (ConsultSessionLog $log) use (&$turns): void {
                foreach ($log->turns ?? [] as $turn) {
                    $turn = TranscriptTurn::fromArray($turn)->toArray();

                    if ($turn['text'] === '') {
                        continue;
                    }

                    $turns[] = $turn;
                }
            });

        return $turns;
    }

    /**
     * Turns from the turn-based fallback chat, oldest first.
     *
     * @return array<int, array{role: string, text: string}>
     */
    private function chatTurns(Consultation $consultation): array
    {
        $conversation = $consultation->conversations()->first();

        if ($conversation === null) {
            return [];
        }

        $turns = [];

        $conversation->messages()
            ->oldest()
            ->get()
            ->each(function (ConversationMessage $message) use (&$turns): void {
                $role = in_array($message->getAttribute('role'), ['user', 'assistant'], true)
                    ? (string) $message->getAttribute('role')
                    : 'assistant';

                $text = trim((string) $message->getAttribute('content'));

                if ($text === '') {
                    return;
                }

                $turns[] = ['role' => $role, 'text' => $text];
            });

        return $turns;
    }

    /**
     * Normalize the free-text query into search terms.
     *
     * @return array<int, string>
     */
    private function terms(string $query): array
    {
        $parts = preg_split('/[\s,;]+/', $query) ?: [];
        $terms = [];

        foreach ($parts as $part) {
            $term = mb_strtolower(trim($part));

            if ($term === '' || in_array($term, $terms, true)) {
                continue;
            }

            $terms[] = $term;

            if (count($terms) >= self::MAX_TERMS) {
                break;
            }
        }

        return $terms;
    }

    /**
     * @param  array{role: string, text: string}  $turn
     * @param  array<int, string>  $terms
     */
    private function matches(array $turn, array $terms): bool
    {
        $text = mb_strtolower($turn['text']);

        foreach ($terms as $term) {
            if (str_contains($text, $term)) {
                return true;
            }
        }

        return false;
    }
}
