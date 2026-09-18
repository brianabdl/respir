<?php

namespace App\Domain\Consult\Jobs;

use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Enums\AuditAction;
use App\Domain\Consult\Actions\AggregateCoughTakes;
use App\Domain\Consult\DTOs\CoughAnalysisResult;
use App\Domain\Consult\Events\CoughAnalysisCompleted;
use App\Domain\Consult\Services\PythonAiClient;
use App\Models\Consultation;
use App\Models\ConsultCapture;
use App\Models\CoughEmbedding;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AnalyseCough implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 300;

    /** @var array<int, int> */
    public array $backoff = [10, 60, 180];

    public function __construct(
        public int $consultationId,
        public int $captureId,
    ) {
        $this->onQueue('ai');
    }

    public function handle(PythonAiClient $client, AuditLogger $auditLogger): void
    {
        $consultation = Consultation::find($this->consultationId);
        $capture = ConsultCapture::find($this->captureId);

        if ($consultation === null || $capture === null) {
            return;
        }

        $contents = Storage::disk($capture->disk)->get($capture->path);

        $result = $client->analyzeCough(
            contents: (string) $contents,
            filename: basename($capture->path),
            mimeType: $capture->mime_type !== '' ? $capture->mime_type : 'audio/webm',
        );

        $capture->forceFill(['analysis' => $result->toArray()])->save();

        $aggregated = (new AggregateCoughTakes)->forConsultation($consultation, $result);

        $consultation->forceFill([
            'cough_analysis' => $aggregated->toArray(),
            'cough_risk' => $aggregated->riskLevel->value,
        ])->save();

        if ($result->embedding !== []) {
            CoughEmbedding::updateOrCreate(
                ['capture_id' => $capture->id],
                [
                    'consultation_id' => $consultation->id,
                    'embedding' => $result->embedding,
                    'risk_level' => $result->riskLevel->value,
                    'model' => (string) ($result->model['version'] ?? $result->model['name'] ?? ''),
                ],
            );
        }

        $auditLogger->record(
            AuditAction::CoughAnalysed,
            subject: $consultation,
            destination: 'ai-service',
            context: [
                'risk_level' => $aggregated->riskLevel->value,
                'duration_s' => $aggregated->durationSeconds,
                'available' => $aggregated->model['available'] ?? false,
            ],
        );

        event(new CoughAnalysisCompleted($consultation, $aggregated));
    }

    public function failed(?Throwable $exception): void
    {
        $consultation = Consultation::find($this->consultationId);

        if ($consultation === null) {
            return;
        }

        $result = CoughAnalysisResult::unanalysed([]);

        ConsultCapture::whereKey($this->captureId)->update(['analysis' => $result->toArray()]);

        $aggregated = (new AggregateCoughTakes)->forConsultation($consultation, $result);

        $consultation->forceFill([
            'cough_analysis' => $aggregated->toArray(),
            'cough_risk' => $aggregated->riskLevel->value,
        ])->save();

        event(new CoughAnalysisCompleted($consultation, $aggregated));
    }
}
