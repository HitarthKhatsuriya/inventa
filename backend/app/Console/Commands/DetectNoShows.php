<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\AppNotification;
use App\Models\ClinicSetting;
use Carbon\Carbon;
use Illuminate\Console\Command;

class DetectNoShows extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'mediq:detect-no-shows';

    /**
     * The console command description.
     */
    protected $description = 'Automatically mark overdue appointments as no-show based on grace period';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $gracePeriod = (int) ClinicSetting::getValue('no_show_grace_minutes', '15');
        $cutoff = Carbon::now()->subMinutes($gracePeriod);

        // Find all booked appointments for today where the slot time + grace period has passed
        $overdueAppointments = Appointment::with(['doctor.user:id,name'])
            ->whereDate('appointment_date', now()->toDateString())
            ->where('status', 'booked')
            ->get()
            ->filter(function ($appointment) use ($cutoff) {
                // Parse the slot_time and combine with today's date
                $slotDateTime = Carbon::parse(
                    $appointment->appointment_date->format('Y-m-d') . ' ' . $appointment->slot_time
                );
                return $slotDateTime->lessThan($cutoff);
            });

        $count = 0;

        foreach ($overdueAppointments as $appointment) {
            $appointment->status = 'no_show';
            $appointment->save();

            // Create notification for the patient
            AppNotification::create([
                'user_id' => $appointment->patient_id,
                'appointment_id' => $appointment->id,
                'type' => 'no_show',
                'message' => "Your appointment with {$appointment->doctor->user->name} has been marked as No-Show. Please contact the clinic to reschedule.",
            ]);

            // Recalculate queue positions
            $this->recalculateQueuePositions(
                $appointment->doctor_id,
                $appointment->appointment_date
            );

            $count++;
        }

        $this->info("Detected {$count} no-show appointment(s).");

        return Command::SUCCESS;
    }

    /**
     * Recalculate queue positions after removing a no-show
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
