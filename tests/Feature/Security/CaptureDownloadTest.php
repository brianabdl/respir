<?php

use App\Models\Consultation;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

function signedCaptureUrl(Consultation $consultation, int $captureId): string
{
    return URL::temporarySignedRoute('consult.captures.download', now()->addMinutes(30), [
        'consultation' => $consultation->id,
        'capture' => $captureId,
    ]);
}

function captureFor(Consultation $consultation, string $path = 'captures/scan.png'): int
{
    Storage::disk('local')->put($path, 'image-bytes');

    return $consultation->captures()->create([
        'type' => 'photo',
        'path' => $path,
        'disk' => 'local',
        'mime_type' => 'image/png',
        'captured_at' => now(),
    ])->id;
}

test('an unsigned capture download is rejected', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $captureId = captureFor($consultation);

    $this->get(route('consult.captures.download', [
        'consultation' => $consultation->id,
        'capture' => $captureId,
    ]))->assertForbidden();
});

test('the consultation owner can download through a signed url', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $captureId = captureFor($consultation);

    $this->get(signedCaptureUrl($consultation, $captureId))->assertOk();
});

test('doctors can download through a signed url', function () {
    Storage::fake('local');

    $doctor = User::factory()->create(['role' => 'doctor']);
    $consultation = Consultation::factory()->create();
    $this->actingAs($doctor);

    $captureId = captureFor($consultation);

    $this->get(signedCaptureUrl($consultation, $captureId))->assertOk();
});

test('a foreign patient is rejected even with a valid signature', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();
    $this->actingAs($user);

    $captureId = captureFor($consultation);

    $this->get(signedCaptureUrl($consultation, $captureId))->assertForbidden();
});

test('an expired signed url is rejected', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $captureId = captureFor($consultation);

    $url = URL::temporarySignedRoute('consult.captures.download', now()->subMinute(), [
        'consultation' => $consultation->id,
        'capture' => $captureId,
    ]);

    $this->get($url)->assertForbidden();
});
