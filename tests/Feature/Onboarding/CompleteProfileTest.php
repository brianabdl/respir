<?php

use App\Models\User;

test('onboarding page is displayed for a patient with an incomplete profile', function () {
    $user = User::factory()->needsOnboarding()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('onboarding.profile.edit'));

    $response->assertOk();
});

test('a patient with an incomplete profile is redirected away from the dashboard', function () {
    $user = User::factory()->needsOnboarding()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard'));

    $response->assertRedirect(route('onboarding.profile.edit'));
});

test('a patient with an incomplete profile is redirected away from the consult flow', function () {
    $user = User::factory()->needsOnboarding()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('consult'));

    $response->assertRedirect(route('onboarding.profile.edit'));
});

test('a doctor is never redirected to onboarding', function () {
    $doctor = User::factory()->needsOnboarding()->create(['role' => 'doctor']);

    $response = $this
        ->actingAs($doctor)
        ->get(route('dashboard'));

    $response->assertOk();
});

test('personalization details can be saved and mark the profile complete', function () {
    $user = User::factory()->needsOnboarding()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('onboarding.profile.update'), [
            'date_of_birth' => '1990-05-14',
            'sex' => 'female',
            'phone' => '+1 555 123 4567',
            'address' => '123 Main St, Springfield',
            'emergency_contact_name' => 'Jane Doe',
            'emergency_contact_phone' => '+1 555 987 6543',
            'privacy_policy_accepted' => true,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('dashboard'));

    $user->refresh();

    expect($user->date_of_birth->toDateString())->toBe('1990-05-14');
    expect($user->sex)->toBe('female');
    expect($user->phone)->toBe('+1 555 123 4567');
    expect($user->address)->toBe('123 Main St, Springfield');
    expect($user->emergency_contact_name)->toBe('Jane Doe');
    expect($user->emergency_contact_phone)->toBe('+1 555 987 6543');
    expect($user->profile_completed_at)->not->toBeNull();
    expect($user->privacy_policy_accepted_at)->not->toBeNull();
});

test('personalization requires the mandatory fields, including privacy policy acceptance', function () {
    $user = User::factory()->needsOnboarding()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('onboarding.profile.update'), []);

    $response->assertSessionHasErrors([
        'date_of_birth', 'sex', 'phone', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'privacy_policy_accepted',
    ]);

    expect($user->fresh()->profile_completed_at)->toBeNull();
    expect($user->fresh()->privacy_policy_accepted_at)->toBeNull();
});

test('personalization is rejected if the privacy policy is not accepted', function () {
    $user = User::factory()->needsOnboarding()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('onboarding.profile.update'), [
            'date_of_birth' => '1990-05-14',
            'sex' => 'female',
            'phone' => '+1 555 123 4567',
            'address' => '123 Main St, Springfield',
            'emergency_contact_name' => 'Jane Doe',
            'emergency_contact_phone' => '+1 555 987 6543',
            'privacy_policy_accepted' => false,
        ]);

    $response->assertSessionHasErrors(['privacy_policy_accepted']);
    expect($user->fresh()->profile_completed_at)->toBeNull();
});

test('a completed profile is not redirected to onboarding', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();
});

test('the privacy policy page is publicly reachable', function () {
    $response = $this->get(route('privacy'));

    $response->assertOk();
});
