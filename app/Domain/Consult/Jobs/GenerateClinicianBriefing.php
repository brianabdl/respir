<?php

namespace App\Domain\Consult\Jobs;

use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Enums\AuditAction;
use App\Domain\Consult\DTOs\ClinicianBriefing;
use App\Domain\Consult\Events\ConsultationUpdated;
use App\Domain\Consult\Exceptions\AiServiceUnavailable;
use App\Domain\Consult\Services\BriefingPayloadBuilder;
use App\Domain\Consult\Services\PythonAiClient;
use App\Models\Consultation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class GenerateClinicianBriefing implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 300;

    /** @var array<int, int> */
    public array $backoff = [10, 60, 180];

    public function __construct(public int $consultationId)
    {
        $this->onQueue('ai');
    }

    public function handle(PythonAiClient $client, BriefingPayloadBuilder $builder, AuditLogger $auditLogger): void
    {
        $consultation = Consultation::find($this->consultationId);

        if ($consultation === null) {
            return;
        }

        $briefing = $client->briefing($builder->build($consultation));

        $consultation->forceFill(['report' => $briefing->toArray()])->save();

        $auditLogger->record(
            AuditAction::BriefingGenerated,
            subject: $consultation,
            destination: 'ai-service',
            context: ['degraded' => $briefing->degraded, 'generated_by' => $briefing->generatedBy],
        );

        event(new ConsultationUpdated($consultation->refresh(), ['report']));
    }

    public function failed(?Throwable $exception): void
    {
        if ($exception instanceof AiServiceUnavailable) {
            report($exception);
        }

        $consultation = Consultation::find($this->consultationId);

        if ($consultation === null) {
            return;
        }

        $consultation->forceFill([
            'report' => ClinicianBriefing::unavailable()->toArray(),
        ])->save();

        event(new ConsultationUpdated($consultation->refresh(), ['report']));
    }
}
