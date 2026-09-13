<?php

use App\Domain\Audit\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\Consultation;
use App\Models\ConsultSessionLog;
use App\Models\User;
use Illuminate\Support\Str;

test('conversation context returns matching turns from earlier voice sessions', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    ConsultSessionLog::factory()->for($consultation)->create([
        'turns' => [
            ['role' => 'assistant', 'text' => 'How are you feeling?'],
            ['role' => 'user', 'text' => 'I have had a dry cough for two weeks'],
            ['role' => 'assistant', 'text' => 'Any fever with that?'],
            ['role' => 'user', 'text' => 'No fever, just tiredness'],
        ],
    ]);
    $this->actingAs($user);

    $this->get(route('consult.context', $consultation).'?q=cough')
        ->assertOk()
        ->assertJsonPath('found', 1)
        ->assertJsonPath('turns.0.text', 'I have had a dry cough for two weeks')
        ->assertJsonCount(1, 'turns');
});

test('conversation context returns fallback chat history', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    $conversation = $consultation->conversations()->create([
        'id' => (string) Str::uuid7(),
        'title' => 'pre-visit chat',
    ]);
    $conversation->messages()->create([
        'id' => (string) Str::uuid7(),
        'participant_type' => $user->getMorphClass(),
        'participant_id' => $user->id,
        'agent' => 'consult',
        'role' => 'user',
        'content' => 'I had night sweats every night this week',
        'attachments' => [],
        'tool_calls' => [],
        'tool_results' => [],
        'usage' => [],
        'meta' => [],
    ]);
    $this->actingAs($user);

    $this->get(route('consult.context', $consultation).'?q=sweats')
        ->assertOk()
        ->assertJsonPath('found', 1)
        ->assertJsonPath('turns.0.role', 'user')
        ->assertJsonPath('turns.0.text', 'I had night sweats every night this week');
});

test('conversation context returns no turns when nothing matches', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    ConsultSessionLog::factory()->for($consultation)->create([
        'turns' => [
            ['role' => 'user', 'text' => 'Just some tiredness, nothing else'],
        ],
    ]);
    $this->actingAs($user);

    $this->get(route('consult.context', $consultation).'?q=hemoptysis')
        ->assertOk()
        ->assertJsonPath('found', 0)
        ->assertJsonCount(0, 'turns');
});

test('conversation context recalls the most recent turns when no query given', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    ConsultSessionLog::factory()->for($consultation)->create([
        'turns' => [
            ['role' => 'assistant', 'text' => 'Hello, how are you feeling?'],
            ['role' => 'user', 'text' => 'I have a wet cough'],
        ],
    ]);
    $this->actingAs($user);

    $this->get(route('consult.context', $consultation))
        ->assertOk()
        ->assertJsonPath('found', 2)
        ->assertJsonPath('turns.0.role', 'assistant');
});

test('conversation context is denied when the user does not own the consultation', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->create(['consented_at' => now()]);
    $this->actingAs($user);

    $this->get(route('consult.context', $consultation).'?q=fever')
        ->assertForbidden();
});

test('conversation context is blocked without recorded consent', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create();
    $this->actingAs($user);

    $this->get(route('consult.context', $consultation).'?q=fever')
        ->assertForbidden();
});

test('conversation context access is recorded in the audit log', function () {
    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    ConsultSessionLog::factory()->for($consultation)->create([
        'turns' => [['role' => 'user', 'text' => 'I have a cough']],
    ]);
    $this->actingAs($user);

    $this->get(route('consult.context', $consultation).'?q=cough');

    $log = AuditLog::where('action', AuditAction::ConversationContextRetrieved->value)->firstOrFail();

    expect($log->subject_id)->toBe($consultation->id);
    expect($log->context['turns_returned'])->toBe(1);
});
