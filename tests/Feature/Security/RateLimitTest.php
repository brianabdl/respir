<?php

use App\Models\Consultation;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

test('the cough endpoint throttles after ten samples per minute', function () {
    Queue::fake();
    Storage::fake('local');

    $user = User::factory()->create();
    $consultation = Consultation::factory()->for($user)->create(['consented_at' => now()]);
    $this->actingAs($user);

    for ($attempt = 0; $attempt < 10; $attempt++) {
        $this->post(route('consult.cough', $consultation), [
            'audio' => UploadedFile::fake()->create('cough.webm', 8, 'audio/webm'),
        ])->assertStatus(202);
    }

    $this->post(route('consult.cough', $consultation), [
        'audio' => UploadedFile::fake()->create('cough.webm', 8, 'audio/webm'),
    ])->assertStatus(429);
});
