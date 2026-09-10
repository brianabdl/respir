<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\ConsultSessionLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ConsultSessionLog>
 */
class ConsultSessionLogFactory extends Factory
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
            'turns' => [],
            'started_at' => now(),
            'ended_at' => null,
        ];
    }
}
