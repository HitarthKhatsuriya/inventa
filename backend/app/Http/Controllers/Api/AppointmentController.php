<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\DoctorSlot;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    /**
     * GET /api/appointments
     * List appointments filtered by role
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Appointment::with(['patient:id,name,email,phone', 'doctor.user:id,name']);

        if ($user->isPatient()) {
            // Patients see only their own appointments
            $query->where('patient_id', $user->id);
        } elseif ($user->isDoctor()) {
            // Doctors see only their queue
            $doctorProfile = $user->doctorProfile;
            if ($doctorProfile) {
                $query->where('doctor_id', $doctorProfile->id);
            }
        }
        // Admin sees all

        // Date filter
        if ($request->has('date')) {
            $query->whereDate('appointment_date', $request->date);
        }

        // Status filter
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $appointments = $query->orderBy('appointment_date', 'desc')
            ->orderBy('token_number', 'asc')
            ->paginate(50);

        return response()->json($appointments);
    }

    /**
     * POST /api/appointments
     * Book an appointment (patient or admin)
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'appointment_date' => 'required|date|after_or_equal:today',
            'slot_time' => 'required|date_format:H:i',
            'patient_id' => 'nullable|exists:users,id', // Admin can book for a patient
            'notes' => 'nullable|string|max:1000',
        ]);

        $patientId = $user->isAdmin() && $request->patient_id
            ? $request->patient_id
            : $user->id;

        $doctor = Doctor::findOrFail($request->doctor_id);

        // Check if the doctor has a slot for this day and time
        $dayOfWeek = \Carbon\Carbon::parse($request->appointment_date)->dayOfWeek;
        $slot = DoctorSlot::where('doctor_id', $doctor->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('start_time', '<=', $request->slot_time)
            ->where('end_time', '>=', $request->slot_time)
            ->where('is_active', true)
            ->first();

        if (!$slot) {
            return response()->json([
                'message' => 'Doctor is not available at this time slot.'
            ], 422);
        }

        // Check max patients for this slot on this date
        $existingCount = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $request->appointment_date)
            ->whereIn('status', ['booked', 'arrived', 'in_consultation', 'done'])
            ->count();

        if ($existingCount >= $slot->max_patients) {
            return response()->json([
                'message' => 'This slot is fully booked. Maximum ' . $slot->max_patients . ' patients.'
            ], 422);
        }

        // Prevent double booking (same patient, same doctor, same day)
        $exists = Appointment::where('patient_id', $patientId)
            ->where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $request->appointment_date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'You already have an appointment with this doctor on this date.'
            ], 422);
        }

        // Generate token number (sequential per doctor per day)
        $tokenNumber = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $request->appointment_date)
            ->max('token_number') + 1;

        // Queue position (among active appointments)
        $queuePosition = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $request->appointment_date)
            ->whereIn('status', ['booked', 'arrived', 'in_consultation'])
            ->count() + 1;

        $appointment = Appointment::create([
            'patient_id' => $patientId,
            'doctor_id' => $doctor->id,
            'appointment_date' => $request->appointment_date,
            'slot_time' => $request->slot_time,
            'token_number' => $tokenNumber,
            'queue_position' => $queuePosition,
            'status' => 'booked',
            'notes' => $request->notes,
        ]);

        // Create booking confirmation notification
        AppNotification::create([
            'user_id' => $patientId,
            'appointment_id' => $appointment->id,
            'type' => 'booking_confirmed',
            'message' => "Appointment booked with {$doctor->user->name} on {$request->appointment_date}. Token #{$tokenNumber}.",
        ]);

        return response()->json([
            'message' => 'Appointment booked successfully.',
            'appointment' => $appointment->load(['patient:id,name,email,phone', 'doctor.user:id,name']),
            'booking_reference' => $appointment->booking_reference,
            'token_number' => $appointment->token_number,
        ], 201);
    }

    /**
     * GET /api/appointments/{id}
     * Single appointment detail
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::with([
            'patient:id,name,email,phone',
            'doctor.user:id,name',
            'visitLog',
        ])->findOrFail($id);

        $user = $request->user();

        // Access control
        if ($user->isPatient() && $appointment->patient_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($user->isDoctor()) {
            $doctorProfile = $user->doctorProfile;
            if (!$doctorProfile || $appointment->doctor_id !== $doctorProfile->id) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }
        }

        return response()->json($appointment);
    }

    /**
     * PUT /api/appointments/{id}/status
     * Update appointment status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:booked,arrived,in_consultation,done,no_show,cancelled',
        ]);

        $appointment = Appointment::findOrFail($id);
        $newStatus = $request->status;

        // Validate status transitions
        $validTransitions = [
            'booked' => ['arrived', 'cancelled', 'no_show'],
            'arrived' => ['in_consultation', 'cancelled', 'no_show'],
            'in_consultation' => ['done'],
            'done' => [],
            'no_show' => ['arrived'], // Admin can un-mark no-show
            'cancelled' => [],
        ];

        if (!in_array($newStatus, $validTransitions[$appointment->status] ?? [])) {
            return response()->json([
                'message' => "Cannot transition from '{$appointment->status}' to '{$newStatus}'."
            ], 422);
        }

        // Cannot start consultation unless arrived
        if ($newStatus === 'in_consultation' && $appointment->status !== 'arrived') {
            return response()->json([
                'message' => 'Patient must be marked as arrived before starting consultation.'
            ], 422);
        }

        $appointment->status = $newStatus;
        $appointment->save();

        // Recalculate queue positions for this doctor today
        $this->recalculateQueuePositions($appointment->doctor_id, $appointment->appointment_date);

        return response()->json([
            'message' => 'Status updated.',
            'appointment' => $appointment->fresh()->load(['patient:id,name,email,phone', 'doctor.user:id,name']),
        ]);
    }

    /**
     * DELETE /api/appointments/{id}
     * Cancel appointment
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::findOrFail($id);
        $user = $request->user();

        // Patients can only cancel their own
        if ($user->isPatient() && $appointment->patient_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (!$appointment->canBeCancelled()) {
            return response()->json([
                'message' => 'Cannot cancel an appointment that is already ' . $appointment->status . '.'
            ], 422);
        }

        $appointment->status = 'cancelled';
        $appointment->save();

        // Recalculate queue
        $this->recalculateQueuePositions($appointment->doctor_id, $appointment->appointment_date);

        // Send cancellation notification
        AppNotification::create([
            'user_id' => $appointment->patient_id,
            'appointment_id' => $appointment->id,
            'type' => 'cancellation',
            'message' => 'Your appointment has been cancelled.',
        ]);

        return response()->json(['message' => 'Appointment cancelled.']);
    }

    /**
     * Recalculate queue positions for a doctor on a specific date
     */
    private function recalculateQueuePositions(int $doctorId, $date): void
    {
        $appointments = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->whereIn('status', ['booked', 'arrived', 'in_consultation'])
            ->orderBy('token_number', 'asc')
            ->get();

        $position = 1;
        foreach ($appointments as $apt) {
            $apt->queue_position = $position++;
            $apt->save();
        }
    }
}
