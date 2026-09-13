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
            ->where('consultation', null));
});

test('patients see only their own latest consultation', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $consultation = Consultation::factory()->for($user)->create([
        'cough_risk' => 'low',
    ]);
    Consultation::factory()->create();

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('view', 'patient')
            ->where('consultation.id', $consultation->id)
            ->where('consultation.cough_risk', 'low'));
});
