<?php

use App\Domain\Audit\AuditLogger;
use App\Domain\Audit\Enums\AuditAction;
use App\Domain\Consult\Jobs\AnalyseCough;
use App\Domain\Consult\Services\PythonAiClient;
use App\Models\AuditLog;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

test('doctor viewing a consultation is audited', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $consultation = Consultation::factory()->create();
    $this->actingAs($doctor);

    $this->get(route('doctor.consultations.show', $consultation))->assertOk();

    $log = AuditLog::where('action', AuditAction::ConsultationViewed->value)->firstOrFail();

    expect($log->actor_id)->toBe($doctor->id)
        ->and($log->subject_type)->toBe($consultation->getMorphClass())
        ->and($log->subject_id)->toBe($consultation->id);
});

test('doctor listing consultations is audited', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $this->actingAs($doctor);

    $this->get(route('doctor.consultations.index'))->assertOk();

    expect(AuditLog::where('action', AuditAction::ConsultationListViewed->value)->exists())->toBeTrue();
});

test('briefing requests are audited', function () {
    Queue::fake();

    $doctor = User::factory()->create(['role' => 'doctor']);
    $consultation = Consultation::factory()->create();
    $this->actingAs($doctor);

    $this->post(route('doctor.consultations.briefing', $consultation))->assertStatus(202);

    $log = AuditLog::where('action', AuditAction::BriefingRequested->value)->firstOrFail();

    expect($log->destination)->toBe('ai-service')
        ->and($log->subject_id)->toBe($consultation->id);
});

test('consent recording is audited', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('consult.consent', $consultation))->assertOk();

    $log = AuditLog::where('action', AuditAction::ConsentRecorded->value)->firstOrFail();

    expect($log->actor_id)->toBe($user->id)
        ->and($log->context['consented_at'])->not->toBeNull();
});

test('cough analysis logs the external AI call', function () {
    config(['services.ai_service.retries' => 0]);
    Storage::fake('local');
    Http::fake([
        '*/v1/cough/analyze' => Http::response([
            'risk_level' => 'medium',
            'risk_score' => 0.5,
            'findings' => 'Wet cough',
            'recommendation' => 'Review',
            'embedding' => array_fill(0, 512, 0.2),
            'model' => ['name' => 'tb', 'version' => 'hear', 'available' => true],
            'duration_s' => 3.0,
        ]),
    ]);

    $consultation = Consultation::factory()->create();
    Storage::disk('local')->put('captures/cough.webm', 'bytes');
    $capture = $consultation->captures()->create([
        'type' => 'audio',
        'path' => 'captures/cough.webm',
        'disk' => 'local',
        'mime_type' => 'audio/webm',
        'captured_at' => now(),
    ]);

    (new AnalyseCough($consultation->id, $capture->id))
        ->handle(app(PythonAiClient::class), app(AuditLogger::class));

    $log = AuditLog::where('action', AuditAction::CoughAnalysed->value)->firstOrFail();

    expect($log->destination)->toBe('ai-service')
        ->and($log->context['risk_level'])->toBe('medium')
        ->and($log->actor_id)->toBeNull();
});

test('capture downloads are audited', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    Storage::disk('local')->put('captures/scan.png', 'image-bytes');
    $capture = $consultation->captures()->create([
        'type' => 'photo',
        'path' => 'captures/scan.png',
        'disk' => 'local',
        'mime_type' => 'image/png',
        'captured_at' => now(),
    ]);

    $url = URL::temporarySignedRoute('consult.captures.download', now()->addMinutes(30), [
        'consultation' => $consultation->id,
        'capture' => $capture->id,
    ]);

    $this->get($url)->assertOk();

    $log = AuditLog::where('action', AuditAction::CaptureDownloaded->value)->firstOrFail();

    expect($log->actor_id)->toBe($user->id)
        ->and($log->subject_id)->toBe($capture->id);
});
