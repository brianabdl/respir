<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\CoughEmbedding;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoughEmbedding>
 */
class CoughEmbeddingFactory extends Factory
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
            'capture_id' => null,
            'embedding' => array_fill(0, 512, 0.0),
            'risk_level' => 'low',
            'model' => 'test-model',
        ];
    }

    /**
     * Set a specific embedding vector.
     *
     * @param  array<int, float>  $embedding
     */
    public function withEmbedding(array $embedding): static
    {
        return $this->state(fn (): array => ['embedding' => $embedding]);
    }
}
