<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Doctor extends Model
{
    protected $fillable = [
        'user_id',
        'specialization',
        'avg_consultation_minutes',
        'bio',
        'photo_url',
        'is_running_late',
    ];

    protected function casts(): array
    {
        return [
            'is_running_late' => 'boolean',
            'avg_consultation_minutes' => 'integer',
        ];
    }

    /**
     * Get the user account for this doctor
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the availability slots for this doctor
     */
    public function slots(): HasMany
    {
        return $this->hasMany(DoctorSlot::class);
    }

    /**
     * Get all appointments for this doctor
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Get visit logs for this doctor
     */
    public function visitLogs(): HasMany
    {
        return $this->hasMany(VisitLog::class);
    }

    /**
     * Get today's queue count
     */
    public function todayQueueCount(): int
    {
        return $this->appointments()
            ->whereDate('appointment_date', now()->toDateString())
            ->whereIn('status', ['booked', 'arrived', 'in_consultation'])
            ->count();
    }
}
