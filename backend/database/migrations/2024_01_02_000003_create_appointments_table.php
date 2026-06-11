<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->date('appointment_date');
            $table->time('slot_time');
            $table->integer('token_number');
            $table->integer('queue_position');
            $table->enum('status', [
                'booked', 'arrived', 'in_consultation', 'done', 'no_show', 'cancelled'
            ])->default('booked');
            $table->uuid('booking_reference')->unique();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Prevent double booking: one patient, one doctor, one day
            $table->unique(['patient_id', 'doctor_id', 'appointment_date', 'slot_time'], 'unique_booking');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
