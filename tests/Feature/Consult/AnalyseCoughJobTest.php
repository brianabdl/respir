<?php

use App\Domain\Audit\AuditLogger;
use App\Domain\Consult\Events\CoughAnalysisCompleted;
use App\Domain\Consult\Exceptions\AiServiceUnavailable;
use App\Domain\Consult\Jobs\AnalyseCough;
use App\Domain\Consult\Services\PythonAiClient;
use App\Models\Consultation;
use App\Models\ConsultCapture;
use App\Models\CoughEmbedding;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    config(['services.ai_service.retries' => 0]);
});

function analyseCoughPayload(): array
{
    return [
        'risk_level' => 'high',
        'risk_score' => 0.92,
        'findings' => 'Harsh cough',
        'recommendation' => 'See a doctor',
        'embedding' => array_fill(0, 512, 0.1),
        'model' => ['name' => 'tb', 'version' => 'hear', 'available' => true],
        'duration_s' => 4.2,
    ];
}

function analyseCoughCapture(Consultation $consultation): ConsultCapture
{
    Storage::disk('local')->put('captures/cough.webm', 'cough-bytes');

    return $consultation->captures()->create([
        'type' => 'audio',
        'path' => 'captures/cough.webm',
        'disk' => 'local',
        'mime_type' => 'audio/webm',
        'captured_at' => now(),
    ]);
}

test('analysis job stores results and broadcasts completion', function () {
    Event::fake([CoughAnalysisCompleted::class]);
    Storage::fake('local');
    Http::fake(['*/v1/cough/analyze' => Http::response(analyseCoughPayload())]);

    $consultation = Consultation::factory()->create();
    $capture = analyseCoughCapture($consultation);

    (new AnalyseCough($consultation->id, $capture->id))
        ->handle(app(PythonAiClient::class), app(AuditLogger::class));

    $consultation->refresh();

    expect($consultation->cough_risk)->toBe('high')
        ->and($consultation->cough_analysis['findings'])->toBe('Harsh cough')
        ->and($consultation->cough_analysis['risk_score'])->toBe(0.92);

    $embedding = CoughEmbedding::firstOrFail();

    expect($embedding->capture_id)->toBe($capture->id)
        ->and($embedding->consultation_id)->toBe($consultation->id)
        ->and(count($embedding->embedding))->toBe(512)
        ->and($embedding->risk_level)->toBe('high');

    Event::assertDispatched(CoughAnalysisCompleted::class);
    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/v1/cough/analyze'));
});

test('analysis job falls back to unclear when the service fails', function () {
    Event::fake([CoughAnalysisCompleted::class]);
    Storage::fake('local');
    Http::fake(['*/v1/cough/analyze' => Http::response(['error' => ['code' => 'down']], 503)]);

    $consultation = Consultation::factory()->create();
    $capture = analyseCoughCapture($consultation);
    $job = new AnalyseCough($consultation->id, $capture->id);

    try {
        $job->handle(app(PythonAiClient::class), app(AuditLogger::class));
    } catch (AiServiceUnavailable $exception) {
        $job->failed($exception);
    }

    $consultation->refresh();

    expect($consultation->cough_risk)->toBe('unclear')
        ->and($consultation->cough_analysis['risk_level'])->toBe('unclear');

    expect(CoughEmbedding::count())->toBe(0);

    Event::assertDispatched(CoughAnalysisCompleted::class);
});
