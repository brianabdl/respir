<?php

use App\Models\Consultation;
use App\Models\User;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    config(['broadcasting.default' => 'reverb']);

    // phpunit boots with BROADCAST_CONNECTION=null, so channel definitions must
    // be registered on the reverb driver before the auth endpoint is hit.
    require base_path('routes/channels.php');
});

/**
 * Authenticate against a private broadcast channel as the given user.
 */
function authorizeChannel(?User $user, Consultation $consultation): TestResponse
{
    if ($user !== null) {
        test()->actingAs($user);
    }

    return test()->post('/broadcasting/auth', [
        'socket_id' => '123456.789101',
        'channel_name' => "private-consultation.{$consultation->id}",
    ]);
}

test('the consultation owner can join their private channel', function () {
    $patient = User::factory()->create();
    $consultation = Consultation::factory()->for($patient)->create();

    authorizeChannel($patient, $consultation)->assertOk();
});

test('doctors can join a patient consultation channel', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $consultation = Consultation::factory()->create();

    authorizeChannel($doctor, $consultation)->assertOk();
});

test('foreign patients cannot join another consultation channel', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();

    authorizeChannel($user, $consultation)->assertForbidden();
});

test('guests cannot join a consultation channel', function () {
    $consultation = Consultation::factory()->create();

    authorizeChannel(null, $consultation)->assertForbidden();
});
