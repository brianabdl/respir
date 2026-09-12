<?php

use App\Domain\Audit\AuditLogger;
use App\Domain\Consult\Events\ConsultationUpdated;
use App\Domain\Consult\Exceptions\AiServiceUnavailable;
use App\Domain\Consult\Jobs\GenerateClinicianBriefing;
use App\Domain\Consult\Services\BriefingPayloadBuilder;
use App\Domain\Consult\Services\PythonAiClient;
use App\Models\Consultation;
use App\Models\ConsultSessionLog;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['services.ai_service.retries' => 0]);
});

function briefingServicePayload(): array
{
    return [
        'chief_complaint' => 'Cough for three weeks',
        'history' => 'Progressive cough with night sweats',
        'risk_factors' => ['close TB contact'],
        'cough_findings' => 'Harsh cough',
        'suggested_questions' => ['Ask about fever'],
        'red_flags' => [],
        'disclaimer' => 'Not a diagnosis.',
        'degraded' => false,
        'generated_by' => 'medgemma-4b-it',
    ];
}

test('briefing job stores the report and broadcasts the update', function () {
    Event::fake([ConsultationUpdated::class]);
    Http::fake(['*/v1/briefing' => Http::response(briefingServicePayload())]);

    $patient = User::factory()->create(['name' => 'Bayu Pratama', 'email' => 'bayu@example.com']);
    $consultation = Consultation::factory()->for($patient)->create([
        'cough_risk' => 'high',
        'cough_analysis' => ['risk_level' => 'high', 'findings' => 'Harsh cough', 'recommendation' => 'See doctor'],
    ]);

    ConsultSessionLog::factory()->for($consultation)->create([
        'turns' => [
            ['role' => 'assistant', 'text' => 'Hello, what is your name?'],
            ['role' => 'user', 'text' => 'My name is Bayu Pratama, email bayu@example.com'],
        ],
    ]);

    (new GenerateClinicianBriefing($consultation->id))
        ->handle(app(PythonAiClient::class), app(BriefingPayloadBuilder::class), app(AuditLogger::class));

    $consultation->refresh();

    expect($consultation->report['generated_by'])->toBe('medgemma-4b-it')
        ->and($consultation->report['degraded'])->toBeFalse();

    Event::assertDispatched(ConsultationUpdated::class);

    Http::assertSent(function ($request) use ($consultation) {
        $body = json_encode($request->data());

        return ! str_contains($body, 'Bayu')
            && ! str_contains($body, 'bayu@example.com')
            && str_contains($body, "PATIENT_{$consultation->user_id}");
    });
});

test('briefing job stores a degraded fallback when the service fails', function () {
    Event::fake([ConsultationUpdated::class]);
    Http::fake(['*/v1/briefing' => Http::response(['error' => ['code' => 'down']], 503)]);

    $consultation = Consultation::factory()->create();
    $job = new GenerateClinicianBriefing($consultation->id);

    try {
        $job->handle(app(PythonAiClient::class), app(BriefingPayloadBuilder::class), app(AuditLogger::class));
    } catch (AiServiceUnavailable $exception) {
        $job->failed($exception);
    }

    $consultation->refresh();

    expect($consultation->report['degraded'])->toBeTrue()
        ->and($consultation->report['generated_by'])->toBe('laravel-fallback');

    Event::assertDispatched(ConsultationUpdated::class);
});
