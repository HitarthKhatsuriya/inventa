<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClinicSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * GET /api/admin/settings
     * Get all clinic settings
     */
    public function getSettings(): JsonResponse
    {
        $settings = ClinicSetting::all()->pluck('value', 'key');

        // Include defaults
        $defaults = [
            'no_show_grace_minutes' => '15',
            'clinic_start_time' => '09:00',
            'clinic_end_time' => '18:00',
            'clinic_name' => 'MEDIQ Healthcare',
        ];

        $result = array_merge($defaults, $settings->toArray());

        return response()->json($result);
    }

    /**
     * PUT /api/admin/settings
     * Update clinic settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($request->settings as $key => $value) {
            ClinicSetting::setValue($key, $value);
        }

        return response()->json(['message' => 'Settings updated.']);
    }

    /**
     * GET /api/admin/users
     * List all users
     */
    public function listUsers(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json($users);
    }

    /**
     * POST /api/admin/users
     * Create user account
     */
    public function createUser(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:patient,doctor,admin',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'phone' => $request->phone,
            'role' => $request->role,
        ]);

        return response()->json([
            'message' => 'User created.',
            'user' => $user,
        ], 201);
    }

    /**
     * PUT /api/admin/users/{id}/toggle-active
     * Activate/deactivate user
     */
    public function toggleUserActive(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->is_active = !$user->is_active;
        $user->save();

        return response()->json([
            'message' => $user->is_active ? 'User activated.' : 'User deactivated.',
            'is_active' => $user->is_active,
        ]);
    }
}
