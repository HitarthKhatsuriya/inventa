<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\VisitLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaitTimeController extends Controller
{
    /**
     * GET /api/wait-time/{booking_reference}
     * Public endpoint — no auth required
     * Returns queue position + estimated wait time
     */
    public function getWaitTime(string $bookingReference): JsonResponse
    {
        $appointment = Appointment::with(['doctor.user:id,name', 'visitLog'])
            ->where('booking_reference', $bookingReference)
            ->firstOrFail();

        // If appointment is done, cancelled, or no_show — return status only
        if (in_array($appointment->status, ['done', 'cancelled', 'no_show'])) {
            return response()->json([
                'status' => $appointment->status,
                'token_number' => $appointment->token_number,
                'doctor_name' => $appointment->doctor->user->name,
                'appointment_date' => $appointment->appointment_date->format('Y-m-d'),
                'slot_time' => $appointment->slot_time,
                'queue_position' => null,
                'patients_ahead' => 0,
                'estimated_wait_minutes' => 0,
                'message' => $this->getStatusMessage($appointment->status),
                'last_updated' => now()->toIso8601String(),
            ]);
        }

        // Calculate wait time
        $waitData = $this->calculateWaitTime($appointment);

        return response()->json(array_merge($waitData, [
            'token_number' => $appointment->token_number,
            'status' => $appointment->status,
            'doctor_name' => $appointment->doctor->user->name,
            'doctor_specialization' => $appointment->doctor->specialization,
            'appointment_date' => $appointment->appointment_date->format('Y-m-d'),
            'slot_time' => $appointment->slot_time,
            'is_doctor_running_late' => $appointment->doctor->is_running_late,
            'last_updated' => now()->toIso8601String(),
        ]));
    }

    /**
     * Core wait-time calculation algorithm from spec Section 7
     */
    private function calculateWaitTime(Appointment $target): array
    {
        $doctor = $target->doctor;

        // Get average duration from last 20 real visits (fallback: 15 min)
        $recentLogs = VisitLog::where('doctor_id', $doctor->id)
            ->whereNotNull('actual_duration_minutes')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->pluck('actual_duration_minutes');

        $avgDuration = $recentLogs->count() > 0
            ? round($recentLogs->avg())
            : $doctor->avg_consultation_minutes;

        // Get all appointments ahead in queue (same doctor, same day, earlier position)
        $ahead = Appointment::with('visitLog')
            ->where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $target->appointment_date)
            ->where('queue_position', '<', $target->queue_position)
            ->whereIn('status', ['arrived', 'in_consultation'])
            ->orderBy('queue_position', 'asc')
            ->get();

        $totalWait = 0;

        foreach ($ahead as $patient) {
            if ($patient->status === 'in_consultation' && $patient->visitLog) {
                // Currently in consultation — estimate remaining time
                $timeSpent = $patient->visitLog->consultation_start->diffInMinutes(now());
                $remaining = max($avgDuration - $timeSpent, 2); // At least 2 min
            } else {
                // 'arrived' but not yet started
                $remaining = $avgDuration;
            }
            $totalWait += $remaining;
        }

        return [
            'queue_position' => $target->queue_position,
            'patients_ahead' => $ahead->count(),
            'estimated_wait_minutes' => round($totalWait),
            'avg_consultation_minutes' => round($avgDuration),
            'message' => $this->getWaitMessage(round($totalWait)),
        ];
    }

    private function getWaitMessage(int $minutes): string
    {
        if ($minutes === 0) return 'You are next!';
        if ($minutes <= 5) return 'Almost your turn!';
        if ($minutes <= 15) return 'Your turn is coming up soon.';
        if ($minutes <= 30) return 'Estimated wait: about ' . $minutes . ' minutes.';
        return 'Estimated wait: approximately ' . $minutes . ' minutes. Consider arriving closer to your time.';
    }

    private function getStatusMessage(string $status): string
    {
        return match ($status) {
            'done' => 'Consultation completed.',
            'cancelled' => 'This appointment has been cancelled.',
            'no_show' => 'You were marked as no-show. Please contact the clinic.',
            default => '',
        };
    }
}
