<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitLog extends Model
{
    protected $fillable = [
        'appointment_id',
        'doctor_id',
        'consultation_start',
        'consultation_end',
        'actual_duration_minutes',
    ];

    protected function casts(): array
    {
        return [
            'consultation_start' => 'datetime',
            'consultation_end' => 'datetime',
            'actual_duration_minutes' => 'integer',
        ];
    }

    /**
     * Get the appointment for this visit log
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    /**
     * Get the doctor for this visit log
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }
}
