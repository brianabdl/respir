<?php

namespace App\Domain\Consult\Actions;

use App\Domain\Consult\DTOs\TranscriptTurn;
use App\Models\Consultation;
use App\Models\ConsultSessionLog;

class SaveSessionTranscript
{
    /**
     * Persist (upsert) the full transcript of one patient voice session.
     *
     * @param  array<string, mixed>  $data
     */
    public function upsert(Consultation $consultation, array $data): ConsultSessionLog
    {
        $log = $consultation->sessionLogs()->firstOrNew([
            'agent_conversation_id' => $data['session_id'],
        ]);

        $log->forceFill([
            'agent_conversation_id' => $data['session_id'],
            'turns' => array_map(
                fn (array $turn) => TranscriptTurn::fromArray($turn)->toArray(),
                $data['turns'],
            ),
            'started_at' => $log->exists ? $log->started_at : ($data['started_at'] ?? now()),
            'ended_at' => ($data['ended'] ?? false) ? now() : null,
        ])->save();

        return $log;
    }
}
