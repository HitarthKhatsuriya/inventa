<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\VisitLog;
use App\Models\Doctor;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * GET /api/analytics/overview
     * Average wait, avg duration, total patients (today/week/month)
     */
    public function overview(): JsonResponse
    {
        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        return response()->json([
            'today' => $this->getPeriodStats($today, $today),
            'this_week' => $this->getPeriodStats($weekStart, $today),
            'this_month' => $this->getPeriodStats($monthStart, $today),
        ]);
    }

    /**
     * GET /api/analytics/doctor/{id}
     * Per-doctor statistics
     */
    public function doctorStats(int $id): JsonResponse
    {
        $doctor = Doctor::with('user:id,name')->findOrFail($id);

        $logs = VisitLog::where('doctor_id', $id)
            ->whereNotNull('actual_duration_minutes')
            ->orderBy('created_at', 'desc');

        $last20 = (clone $logs)->limit(20)->get();
        $allTime = (clone $logs)->get();

        $todayAppointments = Appointment::where('doctor_id', $id)
            ->whereDate('appointment_date', now()->toDateString())
            ->get();

        return response()->json([
            'doctor_name' => $doctor->user->name,
            'specialization' => $doctor->specialization,
            'avg_consultation_minutes' => $last20->avg('actual_duration_minutes') ?? $doctor->avg_consultation_minutes,
            'total_consultations' => $allTime->count(),
            'today' => [
                'total' => $todayAppointments->count(),
                'completed' => $todayAppointments->where('status', 'done')->count(),
                'no_shows' => $todayAppointments->where('status', 'no_show')->count(),
                'remaining' => $todayAppointments->whereIn('status', ['booked', 'arrived'])->count(),
                'in_consultation' => $todayAppointments->where('status', 'in_consultation')->count(),
            ],
            'min_duration' => $allTime->min('actual_duration_minutes'),
            'max_duration' => $allTime->max('actual_duration_minutes'),
        ]);
    }

    /**
     * GET /api/analytics/peak-hours
     * Hour-by-hour appointment distribution
     */
    public function peakHours(Request $request): JsonResponse
    {
        $days = $request->get('days', 30);

        $data = Appointment::whereDate('appointment_date', '>=', now()->subDays($days)->toDateString())
            ->whereIn('status', ['done', 'in_consultation', 'arrived', 'booked'])
            ->selectRaw("CAST(SUBSTR(slot_time, 1, 2) AS INTEGER) as hour, COUNT(*) as count")
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // Fill all 24 hours
        $hours = [];
        for ($h = 0; $h < 24; $h++) {
            $found = $data->firstWhere('hour', $h);
            $hours[] = [
                'hour' => $h,
                'label' => sprintf('%02d:00', $h),
                'count' => $found ? $found->count : 0,
            ];
        }

        return response()->json($hours);
    }

    private function getPeriodStats(string $from, string $to): array
    {
        $appointments = Appointment::whereDate('appointment_date', '>=', $from)
            ->whereDate('appointment_date', '<=', $to)->get();
        $visitLogs = VisitLog::whereHas('appointment', fn($q) => $q->whereDate('appointment_date', '>=', $from)->whereDate('appointment_date', '<=', $to))
            ->whereNotNull('actual_duration_minutes')
            ->get();

        return [
            'total_appointments' => $appointments->count(),
            'completed' => $appointments->where('status', 'done')->count(),
            'no_shows' => $appointments->where('status', 'no_show')->count(),
            'cancelled' => $appointments->where('status', 'cancelled')->count(),
            'avg_consultation_minutes' => round($visitLogs->avg('actual_duration_minutes') ?? 0, 1),
        ];
    }
}
