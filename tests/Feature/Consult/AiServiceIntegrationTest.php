<?php

use App\Domain\Audit\AuditLogger;
use App\Domain\Consult\Exceptions\AiServiceUnavailable;
use App\Domain\Consult\Jobs\AnalyseCough;
use App\Domain\Consult\Services\PythonAiClient;
use App\Models\Consultation;
use Illuminate\Support\Facades\Storage;

/**
 * Live contract test against a running ai-service. Skipped unless
 * AI_SERVICE_INTEGRATION=1 is exported, so CI stays hermetic.
 */
test('cough analysis round-trips through the real python service', function () {
    if (! env('AI_SERVICE_INTEGRATION')) {
        $this->markTestSkipped('Set AI_SERVICE_INTEGRATION=1 with ai-service running.');
    }

    config(['services.ai_service.retries' => 0]);
    Storage::fake('local');

    $consultation = Consultation::factory()->create();

    Storage::disk('local')->put(
        'captures/cough.wav',
        (string) file_get_contents(base_path('tests/Fixtures/cough.wav')),
    );

    $capture = $consultation->captures()->create([
        'type' => 'audio',
        'path' => 'captures/cough.wav',
        'disk' => 'local',
        'mime_type' => 'audio/wav',
        'captured_at' => now(),
    ]);

    try {
        (new AnalyseCough($consultation->id, $capture->id))
            ->handle(app(PythonAiClient::class), app(AuditLogger::class));
    } catch (AiServiceUnavailable $exception) {
        $this->markTestSkipped("ai-service unreachable: {$exception->getMessage()}");
    }

    $consultation->refresh();

    expect($consultation->cough_risk)->toBe('unclear')
        ->and($consultation->cough_analysis['model']['available'])->toBeFalse();
});
