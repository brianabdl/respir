<?php

use App\Ai\Agents\ConsultAgent;
use App\Ai\Agents\CoughAnalysisAgent;
use App\Models\Consultation;
use App\Models\User;
use Illuminate\Http\UploadedFile;
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

test('cough analysis stores the audio and returns the structured result', function () {
    CoughAnalysisAgent::fake([
        ['risk_level' => 'high', 'findings' => 'Harsh', 'recommendation' => 'See doctor'],
    ]);

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $file = UploadedFile::fake()->createWithContent('cough.mp3', 'fake-cough-audio-bytes');

    $this->post(route('consult.cough', $consultation), ['audio' => $file])
        ->assertOk()
        ->assertJsonPath('cough_risk', 'high')
        ->assertJsonPath('cough_analysis.findings', 'Harsh');

    $consultation->refresh();

    expect($consultation->cough_risk)->toBe('high');
    expect($consultation->captures()->where('type', 'audio')->count())->toBe(1);
});

test('cough analysis rejects non-audio uploads', function () {
    CoughAnalysisAgent::fake();
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $file = UploadedFile::fake()->create('photo.png', 4, 'image/png');

    $this->post(route('consult.cough', $consultation), ['audio' => $file])
        ->assertSessionHasErrors('audio');
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
    $consultation = Consultation::factory()->for($user)->create();
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
    $consultation = Consultation::factory()->for($user)->create();
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
    $consultation = Consultation::factory()->for($user)->create();
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
