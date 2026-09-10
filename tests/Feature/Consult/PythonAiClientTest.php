<?php

use App\Domain\Consult\Exceptions\AiServiceUnavailable;
use App\Domain\Consult\Services\PythonAiClient;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['services.ai_service.retries' => 0]);
});

test('cough analysis maps the service response into a DTO', function () {
    Http::fake([
        '*/v1/cough/analyze' => Http::response([
            'risk_level' => 'medium',
            'risk_score' => 0.4,
            'findings' => 'Prolonged cough',
            'recommendation' => 'Book a review',
            'embedding' => [0.5, 0.6],
            'model' => ['name' => 'tb', 'version' => 'hear', 'available' => true],
            'duration_s' => 3.1,
        ]),
    ]);

    $result = app(PythonAiClient::class)->analyzeCough('bytes', 'cough.webm', 'audio/webm');

    expect($result->riskLevel->value)->toBe('medium')
        ->and($result->riskScore)->toBe(0.4)
        ->and($result->findings)->toBe('Prolonged cough')
        ->and($result->embedding)->toBe([0.5, 0.6])
        ->and($result->toArray()['risk_level'])->toBe('medium');

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/v1/cough/analyze'));
    Http::assertSent(fn ($request) => $request->hasHeader(
        'X-Internal-Token',
        (string) config('services.ai_service.token'),
    ));
});

test('client throws a domain exception when the service fails', function () {
    Http::fake(['*/v1/cough/analyze' => Http::response(['error' => ['code' => 'x']], 500)]);

    expect(fn () => app(PythonAiClient::class)->analyzeCough('bytes', 'cough.webm', 'audio/webm'))
        ->toThrow(AiServiceUnavailable::class);
});

test('briefing maps the structured service payload', function () {
    Http::fake([
        '*/v1/briefing' => Http::response([
            'chief_complaint' => 'Cough for three weeks',
            'history' => 'Progressive cough',
            'risk_factors' => ['smoking'],
            'cough_findings' => 'Harsh',
            'suggested_questions' => ['Ask about fever'],
            'red_flags' => ['haemoptysis'],
            'disclaimer' => 'Not a diagnosis.',
            'degraded' => false,
            'generated_by' => 'medgemma-4b-it',
        ]),
    ]);

    $briefing = app(PythonAiClient::class)->briefing(['subject_token' => 'PATIENT_1']);

    expect($briefing->chiefComplaint)->toBe('Cough for three weeks')
        ->and($briefing->riskFactors)->toBe(['smoking'])
        ->and($briefing->redFlags)->toBe(['haemoptysis'])
        ->and($briefing->degraded)->toBeFalse()
        ->and($briefing->generatedBy)->toBe('medgemma-4b-it');
});

test('text embeddings return the vectors', function () {
    Http::fake([
        '*/v1/embeddings/text' => Http::response([
            'embeddings' => [[0.1, 0.2], [0.3, 0.4]],
            'dim' => 2,
            'model' => 'embeddinggemma',
        ]),
    ]);

    $vectors = app(PythonAiClient::class)->textEmbeddings(['one', 'two']);

    expect($vectors)->toBe([[0.1, 0.2], [0.3, 0.4]]);
});
