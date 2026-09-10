<?php

namespace App\Domain\Consult\Jobs;

use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Enums\AuditAction;
use App\Domain\Consult\DTOs\AnemiaAnalysisResult;
use App\Domain\Consult\Events\AnemiaAnalysisCompleted;
use App\Domain\Consult\Services\PythonAiClient;
use App\Models\Consultation;
use App\Models\ConsultCapture;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AnalyseAnemia implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 180;

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

        $result = $client->analyzeAnemia(
            contents: (string) $contents,
            filename: basename($capture->path),
            mimeType: $capture->mime_type !== '' ? $capture->mime_type : 'image/png',
            part: $capture->type,
        );

        $capture->forceFill([
            'analysis' => $result->toArray(),
            'risk_level' => $result->riskLevel->value,
            'analyzed_at' => now(),
        ])->save();

        $auditLogger->record(
            AuditAction::AnemiaAnalysed,
            subject: $consultation,
            destination: 'ai-service',
            context: [
                'part' => $capture->type,
                'risk_level' => $result->riskLevel->value,
                'available' => $result->model['available'] ?? false,
            ],
        );

        event(new AnemiaAnalysisCompleted($consultation, $capture, $result));
    }

    public function failed(?Throwable $exception): void
    {
        $consultation = Consultation::find($this->consultationId);
        $capture = ConsultCapture::find($this->captureId);

        if ($consultation === null || $capture === null) {
            return;
        }

        $result = AnemiaAnalysisResult::unanalysed($capture->type);

        $capture->forceFill([
            'analysis' => $result->toArray(),
            'risk_level' => $result->riskLevel->value,
            'analyzed_at' => now(),
        ])->save();

        event(new AnemiaAnalysisCompleted($consultation, $capture, $result));
    }
}
