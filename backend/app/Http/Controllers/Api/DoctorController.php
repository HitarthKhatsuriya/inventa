<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorSlot;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    /**
     * GET /api/doctors
     * List all active doctors with queue count
     */
    public function index(Request $request): JsonResponse
    {
        $query = Doctor::with('user:id,name,email,phone')
            ->whereHas('user', fn($q) => $q->where('is_active', true));

        if ($request->has('specialization')) {
            $query->where('specialization', 'like', '%' . $request->specialization . '%');
        }

        $doctors = $query->get()->map(function ($doctor) {
            return [
                'id' => $doctor->id,
                'user_id' => $doctor->user_id,
                'name' => $doctor->user->name,
                'email' => $doctor->user->email,
                'specialization' => $doctor->specialization,
                'avg_consultation_minutes' => $doctor->avg_consultation_minutes,
                'bio' => $doctor->bio,
                'photo_url' => $doctor->photo_url,
                'is_running_late' => $doctor->is_running_late,
                'today_queue_count' => $doctor->todayQueueCount(),
            ];
        });

        return response()->json($doctors);
    }

    /**
     * GET /api/doctors/{id}
     * Doctor profile with availability
     */
    public function show(int $id): JsonResponse
    {
        $doctor = Doctor::with(['user:id,name,email,phone', 'slots' => fn($q) => $q->where('is_active', true)])
            ->findOrFail($id);

        return response()->json([
            'id' => $doctor->id,
            'user_id' => $doctor->user_id,
            'name' => $doctor->user->name,
            'email' => $doctor->user->email,
            'phone' => $doctor->user->phone,
            'specialization' => $doctor->specialization,
            'avg_consultation_minutes' => $doctor->avg_consultation_minutes,
            'bio' => $doctor->bio,
            'photo_url' => $doctor->photo_url,
            'is_running_late' => $doctor->is_running_late,
            'today_queue_count' => $doctor->todayQueueCount(),
            'slots' => $doctor->slots,
        ]);
    }

    /**
     * POST /api/doctors
     * Create doctor (admin only)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:20',
            'specialization' => 'required|string|max:255',
            'bio' => 'nullable|string',
            'avg_consultation_minutes' => 'nullable|integer|min:5|max:120',
        ]);

        // Create user account with doctor role
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'phone' => $request->phone,
            'role' => 'doctor',
        ]);

        // Create doctor profile
        $doctor = Doctor::create([
            'user_id' => $user->id,
            'specialization' => $request->specialization,
            'bio' => $request->bio,
            'avg_consultation_minutes' => $request->avg_consultation_minutes ?? 15,
        ]);

        return response()->json([
            'id' => $doctor->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'specialization' => $doctor->specialization,
            'message' => 'Doctor created successfully.',
        ], 201);
    }

    /**
     * PUT /api/doctors/{id}
     * Update doctor (admin only)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $doctor = Doctor::with('user')->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'specialization' => 'sometimes|string|max:255',
            'bio' => 'nullable|string',
            'avg_consultation_minutes' => 'nullable|integer|min:5|max:120',
            'is_active' => 'sometimes|boolean',
        ]);

        // Update user fields
        if ($request->has('name')) $doctor->user->name = $request->name;
        if ($request->has('phone')) $doctor->user->phone = $request->phone;
        if ($request->has('is_active')) $doctor->user->is_active = $request->is_active;
        $doctor->user->save();

        // Update doctor fields
        if ($request->has('specialization')) $doctor->specialization = $request->specialization;
        if ($request->has('bio')) $doctor->bio = $request->bio;
        if ($request->has('avg_consultation_minutes')) $doctor->avg_consultation_minutes = $request->avg_consultation_minutes;
        $doctor->save();

        return response()->json([
            'message' => 'Doctor updated successfully.',
            'doctor' => $doctor->load('user:id,name,email,phone'),
        ]);
    }

    /**
     * GET /api/doctors/{id}/slots
     * Get availability slots for a doctor
     */
    public function getSlots(int $id): JsonResponse
    {
        $doctor = Doctor::findOrFail($id);
        $slots = $doctor->slots()->where('is_active', true)->get();

        return response()->json($slots);
    }

    /**
     * POST /api/doctors/{id}/slots
     * Create availability slot (admin only)
     */
    public function createSlot(Request $request, int $id): JsonResponse
    {
        $doctor = Doctor::findOrFail($id);

        $request->validate([
            'day_of_week' => 'required|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'max_patients' => 'nullable|integer|min:1|max:100',
        ]);

        $slot = DoctorSlot::create([
            'doctor_id' => $doctor->id,
            'day_of_week' => $request->day_of_week,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'max_patients' => $request->max_patients ?? 20,
        ]);

        return response()->json($slot, 201);
    }

    /**
     * DELETE /api/doctors/{doctorId}/slots/{slotId}
     * Delete slot (admin only)
     */
    public function deleteSlot(int $doctorId, int $slotId): JsonResponse
    {
        $slot = DoctorSlot::where('doctor_id', $doctorId)->findOrFail($slotId);
        $slot->delete();

        return response()->json(['message' => 'Slot deleted.']);
    }
}
