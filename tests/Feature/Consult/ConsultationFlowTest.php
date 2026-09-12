<?php

use App\Ai\Agents\ConsultAgent;
use App\Domain\Consult\Jobs\AnalyseCough;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Ai\Audio;
use Laravel\Ai\Transcription;

test('guests are redirected to the login page', function () {
    $this->get(route('consult'))->assertRedirect(route('login'));
});

test('doctors cannot access the consult flow', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $this->actingAs($doctor);

    $this->get(route('consult'))->assertForbidden();
    $this->post(route('consult.store'))->assertForbidden();
});

test('first visit creates a consultation and shows the consult page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('consult'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('consult'));

    expect($user->consultations()->count())->toBe(1);
    expect($user->consultations()->first()->status)->toBe('chatting');
});

test('subsequent visits reuse the in-progress consultation', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $this->get(route('consult'))->assertOk();

    expect($user->consultations()->count())->toBe(1);
});

test('chat is denied when the user does not own the consultation', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();

    $this->actingAs($user);

    $this->post(route('consult.chat', $consultation), ['message' => 'hi'])
        ->assertForbidden();
});

test('chat streams agent deltas and prompts the agent for real calls', function () {
    ConsultAgent::fake(['Hello, how can I help?']);
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->post(
        route('consult.chat', $consultation),
        ['message' => 'hi'],
        ['HTTP_ACCEPT' => 'text/event-stream'],
    );

    $response->assertOk();

    ConsultAgent::assertPrompted('hi');
});

test('chat validates the message', function () {
    ConsultAgent::fake();
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('consult.chat', $consultation), ['message' => ''])
        ->assertSessionHasErrors('message');
});

test('cough analysis is denied when the user does not own the consultation', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();
    $this->actingAs($user);

    $this->post(route('consult.cough', $consultation))
        ->assertForbidden();
});

test('cough analysis stores the audio and queues analysis', function () {
    Queue::fake();

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    $this->actingAs($user);

    $file = UploadedFile::fake()->createWithContent('cough.mp3', 'fake-cough-audio-bytes');

    $this->post(route('consult.cough', $consultation), ['audio' => $file])
        ->assertStatus(202)
        ->assertJsonPath('status', 'processing');

    expect($consultation->captures()->where('type', 'audio')->count())->toBe(1);

    Queue::assertPushed(AnalyseCough::class);
});

test('cough analysis accepts browser webm containers', function () {
    Queue::fake();

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    $this->actingAs($user);

    $file = UploadedFile::fake()->createWithContent('cough.webm', 'fake-cough-audio-bytes', 'video/webm');

    $this->post(route('consult.cough', $consultation), ['audio' => $file])
        ->assertStatus(202)
        ->assertJsonPath('status', 'processing');

    Queue::assertPushed(AnalyseCough::class);
});

test('cough analysis rejects non-audio uploads', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $file = UploadedFile::fake()->create('photo.png', 4, 'image/png');

    $this->post(route('consult.cough', $consultation), ['audio' => $file])
        ->assertSessionHasErrors('audio');
});

test('consent is recorded for the consultation owner', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('consult.consent', $consultation))
        ->assertOk()
        ->assertJsonPath('consented_at', fn (string $value) => $value !== '');

    expect($consultation->refresh()->consented_at)->not->toBeNull();
});

test('consent is denied when the user does not own the consultation', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();
    $this->actingAs($user);

    $this->post(route('consult.consent', $consultation))->assertForbidden();

    expect($consultation->refresh()->consented_at)->toBeNull();
});

test('live voice instruction requires clarification before advancing', function () {
    Http::fake([
        'https://generativelanguage.googleapis.com/v1beta/auth_tokens' => Http::response([
            'name' => 'test-live-token',
        ]),
    ]);
    config(['ai.providers.gemini.key' => 'test-key']);

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    $this->actingAs($user);

    $this->get(route('consult.live.token', $consultation))
        ->assertOk()
        ->assertJsonPath(
            'system_instruction',
            fn (string $instruction): bool => str_contains($instruction, 'repeat or rephrase the same question')
                && str_contains($instruction, 'Never use a checklist in one reply.')
                && ! str_contains($instruction, 'only a doctor can diagnose anything'),
        );
});

test('camera capture stores the media file', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $file = UploadedFile::fake()->create('capture.png', 4, 'image/png');

    $this->post(route('consult.captures.store', $consultation), [
        'type' => 'photo',
        'media' => $file,
    ])->assertCreated()->assertJsonPath('capture.type', 'photo');

    expect($consultation->captures()->where('type', 'photo')->count())->toBe(1);
});

test('camera capture is denied when the user does not own the consultation', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();
    $this->actingAs($user);

    $this->post(route('consult.captures.store', $consultation), [
        'type' => 'photo',
        'media' => UploadedFile::fake()->create('capture.png', 4, 'image/png'),
    ])->assertForbidden();
});

test('voice turn starts with a greeting when no input is given', function () {
    ConsultAgent::fake(['Hello, welcome to our clinic! How are you doing today?']);
    Audio::fake(['fake-wav-bytes']);

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    $this->actingAs($user);

    $this->post(route('consult.voice', $consultation))
        ->assertOk()
        ->assertJsonPath('reply', 'Hello, welcome to our clinic! How are you doing today?');
});

test('voice turn transcribes, replies and returns agent speech', function () {
    Transcription::fake(['I have a fever and cough.']);
    ConsultAgent::fake(['How long have you had the fever?']);
    Audio::fake(['fake-wav-bytes']);

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    $this->actingAs($user);

    $file = UploadedFile::fake()->createWithContent('speech.mp3', 'fake-speech-bytes');

    $response = $this->post(route('consult.voice', $consultation), ['audio' => $file]);

    $response->assertOk()
        ->assertJsonPath('transcript', 'I have a fever and cough.')
        ->assertJsonPath('reply', 'How long have you had the fever?')
        ->assertJsonPath('mime', 'audio/wav')
        ->assertJsonPath('error', fn () => $response->json('error') === null);

    expect(base64_decode((string) $response->json('audio'), true))->toBe('fake-wav-bytes');
});

test('voice turn flags the cough request when the agent asks for a sample', function () {
    ConsultAgent::fake(["I'm ready to record. Please cough toward the microphone twice."]);
    Audio::fake(['fake-wav-bytes']);

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    $this->actingAs($user);

    $this->post(route('consult.voice', $consultation), ['message' => 'ok'])
        ->assertOk()
        ->assertJsonPath('request_cough', true);
});

test('voice turn is denied when the user does not own the consultation', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();
    $this->actingAs($user);

    $this->post(route('consult.voice', $consultation), [
        'audio' => UploadedFile::fake()->createWithContent('speech.mp3', 'x'),
    ])->assertForbidden();
});

test('voice turn is blocked without recorded consent', function () {
    ConsultAgent::fake();

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('consult.voice', $consultation))->assertForbidden();
});

test('cough analysis is blocked without recorded consent', function () {
    Queue::fake();

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $file = UploadedFile::fake()->createWithContent('cough.mp3', 'fake-cough-audio-bytes');

    $this->post(route('consult.cough', $consultation), ['audio' => $file])->assertForbidden();

    expect($consultation->captures()->count())->toBe(0);

    Queue::assertNothingPushed();
});
