<?php

namespace App\Domain\Consult\Events;

use App\Domain\Consult\DTOs\CoughAnalysisResult;
use App\Models\Consultation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CoughAnalysisCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Consultation $consultation,
        public CoughAnalysisResult $result,
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
        return 'cough.analysis';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'consultation_id' => $this->consultation->id,
            'risk_level' => $this->result->riskLevel->value,
            'cough_risk' => $this->result->riskLevel->value,
            'cough_analysis' => $this->result->toArray(),
        ];
    }
}
