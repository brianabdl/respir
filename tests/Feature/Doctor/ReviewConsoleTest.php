<?php

use App\Models\Consultation;
use App\Models\ConsultSessionLog;
use App\Models\User;

test('users default to the patient role', function () {
    $user = User::factory()->create();

    expect($user->isDoctor())->toBeFalse();
});

test('guests cannot list consultations for review', function () {
    $this->get(route('doctor.consultations.index'))->assertRedirect(route('login'));
});

test('patients cannot access the doctor review console', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('doctor.consultations.index'))->assertForbidden();
    $this->get(route('doctor.consultations.show', Consultation::factory()->create()))
        ->assertForbidden();
});

test('doctors can list consultations with session summaries', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $this->actingAs($doctor);

    $patientConsultation = Consultation::factory()->for(User::factory()->create())->create();
    $log = ConsultSessionLog::factory()->for($patientConsultation)->create([
        'turns' => [
            ['role' => 'assistant', 'text' => 'Hello Bayu'],
            ['role' => 'user', 'text' => 'I have a cough'],
        ],
    ]);

    $this->get(route('doctor.consultations.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('doctor/index')
            ->where('consultations.data.0.id', $patientConsultation->id)
            ->where('consultations.data.0.sessions.0.turn_count', 2));
});

test('doctors can read the full transcript, cough analysis and captures', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $this->actingAs($doctor);

    $consultation = Consultation::factory()->for(User::factory()->create())->create([
        'cough_risk' => 'medium',
        'cough_analysis' => ['risk_level' => 'medium', 'findings' => 'Harsh', 'recommendation' => 'See doctor'],
    ]);
    ConsultSessionLog::factory()->for($consultation)->create([
        'turns' => [
            ['role' => 'assistant', 'text' => 'How are you feeling?'],
            ['role' => 'user', 'text' => 'Not great, coughing a lot'],
        ],
    ]);

    $this->get(route('doctor.consultations.show', $consultation))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('doctor/show')
            ->where('consultation.cough_risk', 'medium')
            ->where('consultation.sessions.0.turns.1.text', 'Not great, coughing a lot'));
});

test('patients can persist their voice session transcript for review', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('consult.sessions.log', $consultation), [
        'session_id' => 'live-abc123',
        'turns' => [
            ['role' => 'assistant', 'text' => 'Hello'],
            ['role' => 'user', 'text' => 'I feel feverish'],
        ],
        'ended' => true,
    ])->assertCreated();

    $log = $consultation->sessionLogs()->firstOrFail();

    expect($log->agent_conversation_id)->toBe('live-abc123');
    expect($log->ended_at)->not->toBeNull();
    expect(count($log->turns))->toBe(2);
});

test('session logs are upserted per session id, not duplicated', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $payload = [
        'session_id' => 'live-abc123',
        'turns' => [['role' => 'user', 'text' => 'Hi']],
    ];

    $this->post(route('consult.sessions.log', $consultation), $payload)->assertCreated();
    $this->post(route('consult.sessions.log', $consultation), [
        ...$payload,
        'ended' => true,
    ])->assertCreated();

    expect($consultation->sessionLogs()->count())->toBe(1);
    expect($consultation->sessionLogs()->first()->ended_at)->not->toBeNull();
});

test('foreign patients cannot write session logs to another consultation', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();
    $this->actingAs($user);

    $this->post(route('consult.sessions.log', $consultation), [
        'session_id' => 'live-xyz',
        'turns' => [['role' => 'user', 'text' => 'Hi']],
    ])->assertForbidden();
});
