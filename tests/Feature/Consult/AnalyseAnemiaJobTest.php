<?php

use App\Domain\Audit\AuditLogger;
use App\Domain\Consult\Events\AnemiaAnalysisCompleted;
use App\Domain\Consult\Exceptions\AiServiceUnavailable;
use App\Domain\Consult\Jobs\AnalyseAnemia;
use App\Domain\Consult\Services\PythonAiClient;
use App\Models\Consultation;
use App\Models\ConsultCapture;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    config(['services.ai_service.retries' => 0]);
});

function analyseAnemiaPayload(): array
{
    return [
        'part' => 'palm',
        'risk_level' => 'high',
        'risk_score' => 0.82,
        'prediction' => 'Anemia',
        'threshold' => 0.03,
        'findings' => 'Pallor pattern detected on the palm.',
        'recommendation' => 'Confirm with a blood test.',
        'model' => [
            'name' => 'Sidharth1743/palm-medsiglip-linear-probe',
            'version' => 'medsiglip-linear-probe',
            'available' => true,
        ],
    ];
}

function analyseAnemiaCapture(Consultation $consultation): ConsultCapture
{
    Storage::disk('local')->put('captures/palm.png', 'image-bytes');

    return $consultation->captures()->create([
        'type' => 'palm',
        'path' => 'captures/palm.png',
        'disk' => 'local',
        'mime_type' => 'image/png',
        'captured_at' => now(),
    ]);
}

test('anemia job stores the result on the capture and broadcasts completion', function () {
    Event::fake([AnemiaAnalysisCompleted::class]);
    Storage::fake('local');
    Http::fake(['*/v1/vision/anemia' => Http::response(analyseAnemiaPayload())]);

    $consultation = Consultation::factory()->create();
    $capture = analyseAnemiaCapture($consultation);

    (new AnalyseAnemia($consultation->id, $capture->id))
        ->handle(app(PythonAiClient::class), app(AuditLogger::class));

    $capture->refresh();

    expect($capture->risk_level)->toBe('high')
        ->and($capture->analysis['part'])->toBe('palm')
        ->and($capture->analysis['risk_score'])->toBe(0.82)
        ->and($capture->analysis['model']['available'])->toBeTrue()
        ->and($capture->analyzed_at)->not->toBeNull();

    Event::assertDispatched(AnemiaAnalysisCompleted::class);
    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/v1/vision/anemia')
        && str_contains($request->body(), 'name="part"')
        && str_contains($request->body(), 'palm')
        && $request->hasFile('image'));
});

test('anemia job falls back to unclear when the service fails', function () {
    Event::fake([AnemiaAnalysisCompleted::class]);
    Storage::fake('local');
    Http::fake(['*/v1/vision/anemia' => Http::response(['error' => ['code' => 'down']], 503)]);

    $consultation = Consultation::factory()->create();
    $capture = analyseAnemiaCapture($consultation);
    $job = new AnalyseAnemia($consultation->id, $capture->id);

    try {
        $job->handle(app(PythonAiClient::class), app(AuditLogger::class));
    } catch (AiServiceUnavailable $exception) {
        $job->failed($exception);
    }

    $capture->refresh();

    expect($capture->risk_level)->toBe('unclear')
        ->and($capture->analysis['risk_level'])->toBe('unclear')
        ->and($capture->analysis['part'])->toBe('palm');

    Event::assertDispatched(AnemiaAnalysisCompleted::class);
});
