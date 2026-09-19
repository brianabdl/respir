<?php

use App\Models\Consultation;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('doctors see the queue summary on the dashboard', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $this->actingAs($doctor);

    Consultation::factory()->for(User::factory()->create())->create([
        'cough_risk' => 'high',
        'cough_analysis' => ['risk_level' => 'high'],
    ]);

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('view', 'doctor')
            ->where('summary.total', 1)
            ->where('summary.high', 1)
            ->where('summary.pending', 0)
            ->where('summary.per_day', fn ($days) => count($days) === 30 && collect($days)->sum('count') === 1));
});

test('patients without a consultation see the welcome state', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('view', 'patient')
            ->has('consultations', 0));
});

test('patients see their own consultation history newest first', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $older = Consultation::factory()->for($user)->create([
        'cough_risk' => 'low',
        'created_at' => now()->subDays(2),
    ]);
    $latest = Consultation::factory()->for($user)->create([
        'cough_risk' => 'high',
    ]);
    Consultation::factory()->create();

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('view', 'patient')
            ->has('consultations', 2)
            ->where('consultations.0.id', $latest->id)
            ->where('consultations.0.cough_risk', 'high')
            ->where('consultations.1.id', $older->id)
            ->where('consultations.1.cough_risk', 'low'));
});

test('patient history exposes full result, follow-ups, reviewer, and recording', function () {
    $user = User::factory()->create();
    $doctor = User::factory()->create(['role' => 'doctor']);
    $this->actingAs($user);

    $consultation = Consultation::factory()->for($user)->create([
        'cough_risk' => 'medium',
        'cough_analysis' => ['risk_level' => 'medium', 'risk_score' => 0.5],
        'report' => ['chief_complaint' => 'Cough'],
        'follow_up_actions' => ['Chest X-ray', 'Sputum test'],
        'is_reviewed' => true,
        'reviewed_at' => now(),
        'reviewed_by' => $doctor->id,
    ]);
    $consultation->captures()->create([
        'type' => 'audio',
        'path' => 'captures/cough.webm',
        'disk' => 'local',
        'mime_type' => 'audio/webm',
        'captured_at' => now(),
    ]);

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('view', 'patient')
            ->has('consultations', 1)
            ->where('consultations.0.cough_analysis.risk_score', 0.5)
            ->where('consultations.0.follow_up_actions', ['Chest X-ray', 'Sputum test'])
            ->where('consultations.0.reviewer_name', $doctor->name)
            ->where('consultations.0.audio_download', fn ($url) => is_string($url) && str_contains($url, 'captures')));
});

test('patient history shows the doctor review state', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $reviewed = Consultation::factory()->for($user)->create([
        'report' => ['chief_complaint' => 'Cough'],
        'is_reviewed' => true,
        'reviewed_at' => now(),
        'created_at' => now()->subDay(),
    ]);
    Consultation::factory()->for($user)->create([
        'is_reviewed' => false,
    ]);

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('view', 'patient')
            ->has('consultations', 2)
            ->where('consultations.1.id', $reviewed->id)
            ->where('consultations.1.has_briefing', true)
            ->where('consultations.1.is_reviewed', true));
});
