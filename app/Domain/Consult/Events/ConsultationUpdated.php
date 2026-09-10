<?php

namespace App\Domain\Consult\Events;

use App\Models\Consultation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConsultationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<int, string>  $changes
     */
    public function __construct(
        public Consultation $consultation,
        public array $changes = [],
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("consultation.{$this->consultation->id}")];
    }

    public function broadcastAs(): string
    {
        return 'consultation.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'consultation_id' => $this->consultation->id,
            'status' => $this->consultation->status,
            'changes' => $this->changes,
            'report' => $this->consultation->report,
        ];
    }
}
