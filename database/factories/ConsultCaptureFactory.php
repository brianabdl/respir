<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\ConsultCapture;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ConsultCapture>
 */
class ConsultCaptureFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'consultation_id' => Consultation::factory(),
            'type' => 'video',
            'path' => 'captures/'.fake()->uuid().'.webm',
            'disk' => 'local',
            'mime_type' => 'video/webm',
            'captured_at' => now(),
        ];
    }
}
