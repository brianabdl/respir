<?php

namespace App\Domain\Consult\Events;

use App\Domain\Consult\DTOs\AnemiaAnalysisResult;
use App\Models\Consultation;
use App\Models\ConsultCapture;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnemiaAnalysisCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Consultation $consultation,
        public ConsultCapture $capture,
        public AnemiaAnalysisResult $result,
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
        return 'anemia.analysis';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'consultation_id' => $this->consultation->id,
            'capture_id' => $this->capture->id,
            'part' => $this->result->part,
            'risk_level' => $this->result->riskLevel->value,
            'anemia_analysis' => $this->result->toArray(),
        ];
    }
}
