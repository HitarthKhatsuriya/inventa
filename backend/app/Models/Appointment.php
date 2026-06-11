<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Appointment extends Model
{
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'appointment_date',
        'slot_time',
        'token_number',
        'queue_position',
        'status',
        'booking_reference',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date',
            'token_number' => 'integer',
            'queue_position' => 'integer',
        ];
    }

    /**
     * Boot the model — auto-generate booking reference
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($appointment) {
            if (empty($appointment->booking_reference)) {
                $appointment->booking_reference = Str::uuid()->toString();
            }
        });
    }

    /**
     * Get the patient for this appointment
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /**
     * Get the doctor for this appointment
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    /**
     * Get the visit log for this appointment
     */
    public function visitLog(): HasOne
    {
        return $this->hasOne(VisitLog::class);
    }

    /**
     * Check if appointment can be cancelled
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['booked', 'arrived']);
    }

    /**
     * Check if consultation can be started
     */
    public function canStartConsultation(): bool
    {
        return $this->status === 'arrived';
    }
}
