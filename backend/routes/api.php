<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\QueueController;
use App\Http\Controllers\Api\WaitTimeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| MEDIQ API Routes
|--------------------------------------------------------------------------
| All routes prefixed with /api
*/

// ── AUTH (public) ──────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// ── WAIT TIME (public — no auth needed) ────────────────────────────────
Route::get('/wait-time/{booking_reference}', [WaitTimeController::class, 'getWaitTime']);

// ── DOCTORS (public read, admin write) ─────────────────────────────────
Route::get('/doctors', [DoctorController::class, 'index']);
Route::get('/doctors/{id}', [DoctorController::class, 'show']);
Route::get('/doctors/{id}/slots', [DoctorController::class, 'getSlots']);

// ── AUTHENTICATED ROUTES ───────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Appointments (all authenticated users)
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::get('/appointments/{id}', [AppointmentController::class, 'show']);
    Route::put('/appointments/{id}/status', [AppointmentController::class, 'updateStatus']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);

    // Notifications (all authenticated users)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // ── DOCTOR + ADMIN ROUTES ──────────────────────────────────────────
    Route::middleware('role:doctor,admin')->group(function () {
        Route::get('/queue/{doctor_id}/today', [QueueController::class, 'todayQueue']);
        Route::post('/queue/{appointment_id}/start', [QueueController::class, 'startConsultation']);
        Route::post('/queue/{appointment_id}/end', [QueueController::class, 'endConsultation']);
        Route::post('/queue/{appointment_id}/arrived', [QueueController::class, 'markArrived']);
        Route::post('/queue/{appointment_id}/noshow', [QueueController::class, 'markNoShow']);
    });

    // ── ADMIN ONLY ROUTES ──────────────────────────────────────────────
    Route::middleware('role:admin')->group(function () {
        // Doctor management
        Route::post('/doctors', [DoctorController::class, 'store']);
        Route::put('/doctors/{id}', [DoctorController::class, 'update']);
        Route::post('/doctors/{id}/slots', [DoctorController::class, 'createSlot']);
        Route::delete('/doctors/{doctorId}/slots/{slotId}', [DoctorController::class, 'deleteSlot']);

        // Queue emergency
        Route::post('/queue/emergency', [QueueController::class, 'insertEmergency']);

        // Analytics
        Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('/analytics/doctor/{id}', [AnalyticsController::class, 'doctorStats']);
        Route::get('/analytics/peak-hours', [AnalyticsController::class, 'peakHours']);

        // Admin settings & user management
        Route::get('/admin/settings', [AdminController::class, 'getSettings']);
        Route::put('/admin/settings', [AdminController::class, 'updateSettings']);
        Route::get('/admin/users', [AdminController::class, 'listUsers']);
        Route::post('/admin/users', [AdminController::class, 'createUser']);
        Route::put('/admin/users/{id}/toggle-active', [AdminController::class, 'toggleUserActive']);
    });
});
