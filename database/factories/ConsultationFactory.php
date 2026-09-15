<?php

namespace Database\Factories;

use App\Models\Consultation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Consultation>
 */
class ConsultationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $risk = $this->faker->randomElement(['high', 'medium', 'low', null]);
        $status = $this->faker->randomElement(['completed', 'chatting']);

        return [
            'user_id' => User::factory(),
            'status' => $status,
            'cough_risk' => $risk,
            'cough_analysis' => $risk ? $this->getCoughAnalysis($risk) : null,
            'report' => $status === 'completed' ? $this->getBriefing() : null,
        ];
    }

    private function getCoughAnalysis(string $risk): array
    {
        $score = match ($risk) {
            'high' => $this->faker->randomFloat(2, 0.7, 1.0),
            'medium' => $this->faker->randomFloat(2, 0.4, 0.69),
            'low' => $this->faker->randomFloat(2, 0.0, 0.39),
            default => null,
        };

        return [
            'risk_level' => $risk,
            'risk_score' => $score,
            'explanation' => $this->faker->sentence(20),
        ];
    }

    private function getBriefing(): array
    {
        return [
            'chief_complaint' => $this->faker->sentence(10),
            'history_present_illness' => $this->faker->paragraph(2),
            'medical_history' => $this->faker->sentence(8),
            'clinical_impression' => $this->faker->sentence(12),
            'recommendations' => "- Schedule follow-up appointment\n- Order chest X-ray\n- Consider sputum culture test",
        ];
    }
}
