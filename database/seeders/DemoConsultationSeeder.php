<?php

namespace Database\Seeders;

use App\Models\Consultation;
use App\Models\ConsultCapture;
use App\Models\ConsultSessionLog;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoConsultationSeeder extends Seeder
{
    public function run(): void
    {
        $patients = User::where('role', 'patient')->limit(10)->get();

        if ($patients->count() < 10) {
            $this->command->error('Not enough patients. Expected 10, found '.$patients->count());

            return;
        }

        $data = [
            ['patient' => $patients->get(0), 'risk' => 'high', 'score' => 0.85, 'status' => 'completed'],
            ['patient' => $patients->get(1), 'risk' => 'medium', 'score' => 0.55, 'status' => 'completed'],
            ['patient' => $patients->get(2), 'risk' => 'low', 'score' => 0.25, 'status' => 'completed'],
            ['patient' => $patients->get(3), 'risk' => 'high', 'score' => 0.92, 'status' => 'completed'],
            ['patient' => $patients->get(4), 'risk' => null, 'score' => null, 'status' => 'chatting'],
            ['patient' => $patients->get(5), 'risk' => 'medium', 'score' => 0.48, 'status' => 'completed'],
            ['patient' => $patients->get(6), 'risk' => 'high', 'score' => 0.78, 'status' => 'completed'],
            ['patient' => $patients->get(7), 'risk' => 'low', 'score' => 0.15, 'status' => 'completed'],
            ['patient' => $patients->get(8), 'risk' => 'medium', 'score' => 0.62, 'status' => 'completed'],
            ['patient' => $patients->get(9), 'risk' => 'low', 'score' => 0.08, 'status' => 'completed'],
        ];

        foreach ($data as $item) {
            $this->createConsultation($item);
        }
    }

    private function createConsultation(array $item): void
    {
        $risk = $item['risk'];
        $score = $item['score'];
        $status = $item['status'];

        $consultation = Consultation::create([
            'user_id' => $item['patient']->id,
            'status' => $status,
            'cough_risk' => $risk,
            'cough_analysis' => $risk ? [
                'risk_level' => $risk,
                'risk_score' => $score,
                'explanation' => 'Cough analysis shows patterns consistent with '.$risk.' risk level for tuberculosis',
            ] : null,
            'report' => $status === 'completed' ? [
                'chief_complaint' => $this->getChiefComplaint($risk),
                'history_present_illness' => $this->getHistory($risk),
                'medical_history' => 'No significant medical history reported',
                'clinical_impression' => $this->getClinicalImpression($risk),
                'recommendations' => "- Follow up in 2 weeks\n- Monitor symptoms\n- Contact if condition worsens",
            ] : null,
        ]);

        $this->createSessionLogs($consultation->id);
        $this->createCaptures($consultation->id);
    }

    private function getChiefComplaint(?string $risk): string
    {
        $complaints = [
            'high' => 'Persistent cough for 3 weeks with night sweats and mild fever',
            'medium' => 'Cough for 2 weeks with occasional chest discomfort',
            'low' => 'Mild cough for 5 days, no other symptoms',
        ];

        return $complaints[$risk] ?? 'General discomfort and fatigue';
    }

    private function getHistory(?string $risk): string
    {
        $histories = [
            'high' => 'Patient reports persistent cough starting 3 weeks ago. Night sweats and low-grade fever for the past 10 days. Weight loss of 2 kg reported. History of exposure to TB patient 2 months ago.',
            'medium' => 'Cough began 2 weeks ago. Occasional chest tightness. No fever or night sweats. No known TB exposure.',
            'low' => 'Mild cough for 5 days. No fever, no chest pain. Recent cold symptoms resolving.',
        ];

        return $histories[$risk] ?? 'Patient describes general fatigue and mild respiratory symptoms for the past week.';
    }

    private function getClinicalImpression(?string $risk): string
    {
        $impressions = [
            'high' => 'High suspicion for tuberculosis. Recommend sputum culture and chest X-ray.',
            'medium' => 'Moderate suspicion for respiratory infection. Monitor symptoms.',
            'low' => 'Low suspicion for TB. Likely viral respiratory infection.',
        ];

        return $impressions[$risk] ?? 'Insufficient data for diagnosis. Continue monitoring.';
    }

    private function createSessionLogs(int $consultationId): void
    {
        for ($i = 0; $i < 3; $i++) {
            $startedAt = now()->subDays(rand(1, 6))->setTime(rand(8, 18), rand(0, 59), 0);
            $endedAt = rand(0, 1) ? $startedAt->copy()->addMinutes(rand(5, 15)) : null;

            $turns = [];
            for ($t = 0; $t < rand(10, 20); $t++) {
                $turns[] = [
                    'role' => $t % 2 === 0 ? 'user' : 'assistant',
                    'text' => 'Patient described symptom number '.$t.' during consultation',
                ];
            }

            ConsultSessionLog::create([
                'consultation_id' => $consultationId,
                'turns' => $turns,
                'started_at' => $startedAt,
                'ended_at' => $endedAt,
            ]);
        }
    }

    private function createCaptures(int $consultationId): void
    {
        $types = ['video', 'image', 'audio'];
        $mimes = ['video/webm', 'image/jpeg', 'audio/webm'];

        for ($i = 0; $i < 2; $i++) {
            ConsultCapture::create([
                'consultation_id' => $consultationId,
                'type' => $types[$i % 3],
                'path' => 'captures/'.uniqid().'.webm',
                'disk' => 'local',
                'mime_type' => $mimes[$i % 3],
                'captured_at' => now()->subDays(rand(1, 6))->setTime(rand(8, 18), rand(0, 59), 0),
            ]);
        }
    }
}
