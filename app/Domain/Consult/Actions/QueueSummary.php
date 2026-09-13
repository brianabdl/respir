<?php

namespace App\Domain\Consult\Actions;

use App\Models\Consultation;
use Illuminate\Support\Facades\DB;

class QueueSummary
{
    /**
     * @return array{total: int, high: int, medium: int, low: int, unclear: int, pending: int, needs_briefing: int, today: int, per_day: array<int, array{date: string, count: int}>}
     */
    public function get(): array
    {
        return [
            'total' => Consultation::count(),
            'high' => Consultation::where('cough_risk', 'high')->count(),
            'medium' => Consultation::where('cough_risk', 'medium')->count(),
            'low' => Consultation::where('cough_risk', 'low')->count(),
            'unclear' => Consultation::where('cough_risk', 'unclear')->count(),
            'pending' => Consultation::whereNull('cough_analysis')->count(),
            'needs_briefing' => Consultation::whereNull('report')->whereNotNull('cough_analysis')->count(),
            'today' => Consultation::whereDate('created_at', today())->count(),
            'per_day' => $this->perDay(),
        ];
    }

    /**
     * Consultations per day for the last 30 days, oldest first, gaps filled with zero.
     *
     * @return array<int, array{date: string, count: int}>
     */
    private function perDay(): array
    {
        $start = today()->subDays(29)->startOfDay();

        /** @var array<string, int> $counts */
        $counts = Consultation::query()
            ->selectRaw('DATE(created_at) as day, count(*) as count')
            ->where('created_at', '>=', $start)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('day')
            ->pluck('count', 'day')
            ->mapWithKeys(fn ($count, $day) => [(string) $day => (int) $count])
            ->all();

        $days = [];

        for ($i = 0; $i < 30; $i++) {
            $date = $start->copy()->addDays($i)->toDateString();
            $days[] = ['date' => $date, 'count' => $counts[$date] ?? 0];
        }

        return $days;
    }
}
