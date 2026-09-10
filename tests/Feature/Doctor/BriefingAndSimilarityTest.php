<?php

use App\Domain\Consult\Jobs\GenerateClinicianBriefing;
use App\Models\Consultation;
use App\Models\CoughEmbedding;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

function phaseFiveVector(float ...$head): array
{
    return array_pad($head, 512, 0.0);
}

test('doctors can queue a briefing regeneration', function () {
    Queue::fake();

    $doctor = User::factory()->create(['role' => 'doctor']);
    $consultation = Consultation::factory()->create();
    $this->actingAs($doctor);

    $this->post(route('doctor.consultations.briefing', $consultation))
        ->assertStatus(202)
        ->assertJsonPath('status', 'processing');

    Queue::assertPushed(GenerateClinicianBriefing::class);
});

test('patients cannot queue a briefing regeneration', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();
    $this->actingAs($user);

    $this->post(route('doctor.consultations.briefing', $consultation))
        ->assertForbidden();
});

test('doctors can list similar coughs ordered by distance', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $this->actingAs($doctor);

    $source = Consultation::factory()->create();
    $near = Consultation::factory()->create();
    $far = Consultation::factory()->create();

    CoughEmbedding::factory()->for($source)->withEmbedding(phaseFiveVector(1.0))->create();
    CoughEmbedding::factory()->for($near)->withEmbedding(phaseFiveVector(0.9, 0.1))->create();
    CoughEmbedding::factory()->for($far)->withEmbedding(phaseFiveVector(0.0, 1.0))->create();

    $response = $this->getJson(route('doctor.consultations.similar', $source));

    $response->assertOk();

    $similar = $response->json('similar');

    expect($similar)->toHaveCount(2)
        ->and($similar[0]['consultation_id'])->toBe($near->id)
        ->and($similar[1]['consultation_id'])->toBe($far->id)
        ->and($similar[0]['distance'])->toBeLessThan($similar[1]['distance']);
});

test('similar coughs are empty when the consultation has no embedding', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $consultation = Consultation::factory()->create();
    $this->actingAs($doctor);

    $this->getJson(route('doctor.consultations.similar', $consultation))
        ->assertOk()
        ->assertJsonPath('similar', []);
});

test('patients cannot list similar coughs', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create();
    $this->actingAs($user);

    $this->getJson(route('doctor.consultations.similar', $consultation))
        ->assertForbidden();
});
