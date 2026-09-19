<?php

use App\Domain\Audit\AuditLogger;
use App\Domain\Consult\Enums\RiskLevel;
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

function scoredCoughCapture(Consultation $consultation, float $score, string $findings): ConsultCapture
{
    $capture = analyseCoughCapture($consultation);
    $capture->forceFill(['analysis' => [
        'risk_level' => 'high',
        'risk_score' => $score,
        'findings' => $findings,
        'recommendation' => 'See a doctor',
        'model' => ['name' => 'tb', 'version' => 'hear', 'available' => true],
        'duration_s' => 3.0,
    ]])->save();

    return $capture;
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

test('analysis job reports the median over the last three takes', function () {
    Event::fake([CoughAnalysisCompleted::class]);
    Storage::fake('local');
    Http::fake(['*/v1/cough/analyze' => Http::response(array_merge(analyseCoughPayload(), [
        'risk_level' => 'medium',
        'risk_score' => 0.6,
        'findings' => 'Third take',
    ]))]);

    $consultation = Consultation::factory()->create();
    scoredCoughCapture($consultation, 0.9, 'Older take');
    scoredCoughCapture($consultation, 0.3, 'Middle take');
    $capture = analyseCoughCapture($consultation);

    (new AnalyseCough($consultation->id, $capture->id))
        ->handle(app(PythonAiClient::class), app(AuditLogger::class));

    $consultation->refresh();

    expect($consultation->cough_risk)->toBe('medium')
        ->and($consultation->cough_analysis['risk_score'])->toBe(0.6)
        ->and($consultation->cough_analysis['findings'])->toBe('Third take');

    Event::assertDispatched(CoughAnalysisCompleted::class);
});

test('failed analysis falls back to the median of previous takes', function () {
    Event::fake([CoughAnalysisCompleted::class]);
    Storage::fake('local');
    Http::fake(['*/v1/cough/analyze' => Http::response(['error' => ['code' => 'down']], 503)]);

    $consultation = Consultation::factory()->create();
    scoredCoughCapture($consultation, 0.8, 'Older take');
    scoredCoughCapture($consultation, 0.4, 'Newer take');
    $capture = analyseCoughCapture($consultation);
    $job = new AnalyseCough($consultation->id, $capture->id);

    try {
        $job->handle(app(PythonAiClient::class), app(AuditLogger::class));
    } catch (AiServiceUnavailable $exception) {
        $job->failed($exception);
    }

    $consultation->refresh();

    expect($consultation->cough_risk)->toBe('medium')
        ->and($consultation->cough_analysis['risk_score'])->toBe(0.6)
        ->and($consultation->cough_analysis['findings'])->toBe('Newer take');

    Event::assertDispatched(CoughAnalysisCompleted::class);
});

test('risk bands follow the calibrated cutoffs', function () {
    expect(RiskLevel::fromScore(0.2))->toBe(RiskLevel::Low)
        ->and(RiskLevel::fromScore(0.54))->toBe(RiskLevel::Low)
        ->and(RiskLevel::fromScore(0.55))->toBe(RiskLevel::Medium)
        ->and(RiskLevel::fromScore(0.65))->toBe(RiskLevel::Medium)
        ->and(RiskLevel::fromScore(0.66))->toBe(RiskLevel::High);
});
