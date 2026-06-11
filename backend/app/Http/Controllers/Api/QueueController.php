<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\VisitLog;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class QueueController extends Controller
{
    /**
     * GET /api/queue/{doctor_id}/today
     * Live queue for a doctor today
     */
    public function todayQueue(int $doctorId): JsonResponse
    {
        $doctor = Doctor::with('user:id,name')->findOrFail($doctorId);

        $appointments = Appointment::with(['patient:id,name,phone', 'visitLog'])
            ->where('doctor_id', $doctorId)
            ->whereDate('appointment_date', now()->toDateString())
            ->whereIn('status', ['booked', 'arrived', 'in_consultation', 'done', 'no_show'])
            ->orderBy('queue_position', 'asc')
            ->orderBy('token_number', 'asc')
            ->get();

        $currentPatient = $appointments->firstWhere('status', 'in_consultation');
        $nextPatient = $appointments->where('status', 'arrived')->sortBy('queue_position')->first();

        return response()->json([
            'doctor' => [
                'id' => $doctor->id,
                'name' => $doctor->user->name,
                'specialization' => $doctor->specialization,
                'is_running_late' => $doctor->is_running_late,
                'avg_consultation_minutes' => $doctor->avg_consultation_minutes,
            ],
            'queue' => $appointments,
            'current_patient' => $currentPatient,
            'next_patient' => $nextPatient,
            'total_in_queue' => $appointments->whereIn('status', ['booked', 'arrived', 'in_consultation'])->count(),
            'total_done' => $appointments->where('status', 'done')->count(),
        ]);
    }

    /**
     * POST /api/queue/{appointment_id}/start
     * Start consultation — records timestamp in visit_logs
     */
    public function startConsultation(int $appointmentId): JsonResponse
    {
        $appointment = Appointment::findOrFail($appointmentId);

        if ($appointment->status !== 'arrived') {
            return response()->json([
                'message' => 'Patient must be marked as arrived before starting consultation.'
            ], 422);
        }

        // Ensure no other consultation is currently active for this doctor today
        $activeConsultation = Appointment::where('doctor_id', $appointment->doctor_id)
            ->whereDate('appointment_date', now()->toDateString())
            ->where('status', 'in_consultation')
            ->where('id', '!=', $appointment->id)
            ->first();

        if ($activeConsultation) {
            return response()->json([
                'message' => 'Another consultation is already active. End it first.'
            ], 422);
        }

        $appointment->status = 'in_consultation';
        $appointment->save();

        // Create visit log
        VisitLog::create([
            'appointment_id' => $appointment->id,
            'doctor_id' => $appointment->doctor_id,
            'consultation_start' => now(),
        ]);

        // Recalculate queue
        $this->recalculateQueuePositions($appointment->doctor_id, $appointment->appointment_date);

        return response()->json([
            'message' => 'Consultation started.',
            'appointment' => $appointment->fresh()->load(['patient:id,name,phone', 'visitLog']),
        ]);
    }

    /**
     * POST /api/queue/{appointment_id}/end
     * End consultation — records duration in visit_logs
     */
    public function endConsultation(int $appointmentId): JsonResponse
    {
        $appointment = Appointment::with('visitLog')->findOrFail($appointmentId);

        if ($appointment->status !== 'in_consultation') {
            return response()->json([
                'message' => 'Consultation has not been started.'
            ], 422);
        }

        $visitLog = $appointment->visitLog;
        if (!$visitLog) {
            return response()->json(['message' => 'Visit log not found.'], 500);
        }

        $now = now();
        $duration = $visitLog->consultation_start->diffInMinutes($now);

        $visitLog->update([
            'consultation_end' => $now,
            'actual_duration_minutes' => max($duration, 1), // At least 1 minute
        ]);

        $appointment->status = 'done';
        $appointment->save();

        // Update doctor's average consultation time based on last 20 visits
        $this->updateDoctorAvgDuration($appointment->doctor_id);

        // Recalculate queue
        $this->recalculateQueuePositions($appointment->doctor_id, $appointment->appointment_date);

        // Check for delay
        $doctor = Doctor::find($appointment->doctor_id);
        if ($duration > $doctor->avg_consultation_minutes * 1.5) {
            $this->handleDelay($doctor);
        } else {
            // Clear running late flag if set
            if ($doctor->is_running_late) {
                $doctor->is_running_late = false;
                $doctor->save();
            }
        }

        return response()->json([
            'message' => 'Consultation ended.',
            'duration_minutes' => $duration,
            'appointment' => $appointment->fresh()->load(['patient:id,name,phone', 'visitLog']),
        ]);
    }

    /**
     * POST /api/queue/{appointment_id}/arrived
     * Mark patient as arrived
     */
    public function markArrived(int $appointmentId): JsonResponse
    {
        $appointment = Appointment::findOrFail($appointmentId);

        if (!in_array($appointment->status, ['booked', 'no_show'])) {
            return response()->json([
                'message' => 'Cannot mark as arrived from status: ' . $appointment->status
            ], 422);
        }

        $appointment->status = 'arrived';
        $appointment->save();

        $this->recalculateQueuePositions($appointment->doctor_id, $appointment->appointment_date);

        return response()->json([
            'message' => 'Patient marked as arrived.',
            'appointment' => $appointment->fresh()->load(['patient:id,name,phone']),
        ]);
    }

    /**
     * POST /api/queue/{appointment_id}/noshow
     * Mark patient as no-show
     */
    public function markNoShow(int $appointmentId): JsonResponse
    {
        $appointment = Appointment::findOrFail($appointmentId);

        if (!in_array($appointment->status, ['booked', 'arrived'])) {
            return response()->json([
                'message' => 'Cannot mark as no-show from status: ' . $appointment->status
            ], 422);
        }

        $appointment->status = 'no_show';
        $appointment->save();

        $this->recalculateQueuePositions($appointment->doctor_id, $appointment->appointment_date);

        // Notify patient
        AppNotification::create([
            'user_id' => $appointment->patient_id,
            'appointment_id' => $appointment->id,
            'type' => 'no_show',
            'message' => 'You have been marked as a no-show for your appointment.',
        ]);

        return response()->json([
            'message' => 'Patient marked as no-show.',
            'appointment' => $appointment->fresh(),
        ]);
    }

    /**
     * POST /api/queue/emergency
     * Insert emergency patient at position 1
     */
    public function insertEmergency(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'patient_id' => 'required|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        $doctor = Doctor::findOrFail($request->doctor_id);
        $today = now()->toDateString();

        // Get next token number
        $tokenNumber = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $today)
            ->max('token_number') + 1;

        // Create emergency appointment at position 0 (will be recalculated)
        $appointment = Appointment::create([
            'patient_id' => $request->patient_id,
            'doctor_id' => $doctor->id,
            'appointment_date' => $today,
            'slot_time' => now()->format('H:i'),
            'token_number' => $tokenNumber,
            'queue_position' => 0,
            'status' => 'arrived', // Emergency patients are immediately arrived
            'notes' => '[EMERGENCY] ' . ($request->notes ?? ''),
        ]);

        // Push all other active appointments down by 1
        Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $today)
            ->where('id', '!=', $appointment->id)
            ->whereIn('status', ['booked', 'arrived'])
            ->increment('queue_position');

        // Set emergency appointment to position 1 (or 2 if someone is in consultation)
        $hasActiveConsultation = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $today)
            ->where('status', 'in_consultation')
            ->exists();

        $appointment->queue_position = $hasActiveConsultation ? 2 : 1;
        $appointment->save();

        $this->recalculateQueuePositions($doctor->id, $today);

        return response()->json([
            'message' => 'Emergency patient inserted.',
            'appointment' => $appointment->fresh()->load(['patient:id,name,phone']),
        ], 201);
    }

    /**
     * Update doctor's average consultation duration based on last 20 visits
     */
    private function updateDoctorAvgDuration(int $doctorId): void
    {
        $avgDuration = VisitLog::where('doctor_id', $doctorId)
            ->whereNotNull('actual_duration_minutes')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->avg('actual_duration_minutes');

        if ($avgDuration) {
            Doctor::where('id', $doctorId)->update([
                'avg_consultation_minutes' => round($avgDuration),
            ]);
        }
    }

    /**
     * Handle delay detection
     */
    private function handleDelay(Doctor $doctor): void
    {
        $doctor->is_running_late = true;
        $doctor->save();

        // Notify all arrived patients
        $waitingAppointments = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', now()->toDateString())
            ->where('status', 'arrived')
            ->get();

        foreach ($waitingAppointments as $apt) {
            AppNotification::create([
                'user_id' => $apt->patient_id,
                'appointment_id' => $apt->id,
                'type' => 'delay_alert',
                'message' => "{$doctor->user->name} is running late. Your estimated wait time has been updated.",
            ]);
        }
    }

    /**
     * Recalculate queue positions for a doctor on a specific date
     */
    private function recalculateQueuePositions(int $doctorId, $date): void
    {
        // In-consultation patients get position 1
        $inConsultation = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->where('status', 'in_consultation')
            ->orderBy('token_number')
            ->get();

        // Arrived patients come next
        $arrived = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->where('status', 'arrived')
            ->orderBy('queue_position')
            ->orderBy('token_number')
            ->get();

        // Booked patients last
        $booked = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->where('status', 'booked')
            ->orderBy('token_number')
            ->get();

        $position = 1;

        foreach ($inConsultation as $apt) {
            $apt->queue_position = $position++;
            $apt->save();
        }

        foreach ($arrived as $apt) {
            $apt->queue_position = $position++;
            $apt->save();
        }

        foreach ($booked as $apt) {
            $apt->queue_position = $position++;
            $apt->save();
        }
    }
}
