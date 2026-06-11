<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\AppNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendAppointmentReminders extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'mediq:send-reminders';

    /**
     * The console command description.
     */
    protected $description = 'Send reminder notifications to patients with upcoming appointments today';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $today = now()->toDateString();
        $reminderWindowMinutes = 30; // Remind patients 30 minutes before their slot

        // Find all booked appointments for today where the slot time is 30 min away
        $upcomingAppointments = Appointment::with(['doctor.user:id,name'])
            ->whereDate('appointment_date', $today)
            ->where('status', 'booked')
            ->get()
            ->filter(function ($appointment) use ($reminderWindowMinutes) {
                $slotDateTime = Carbon::parse(
                    $appointment->appointment_date->format('Y-m-d') . ' ' . $appointment->slot_time
                );
                $minutesUntil = now()->diffInMinutes($slotDateTime, false);
                // Send reminder when appointment is 25-35 minutes away
                return $minutesUntil >= ($reminderWindowMinutes - 5)
                    && $minutesUntil <= ($reminderWindowMinutes + 5);
            });

        $count = 0;

        foreach ($upcomingAppointments as $appointment) {
            // Check if a reminder was already sent for this appointment
            $alreadySent = AppNotification::where('appointment_id', $appointment->id)
                ->where('type', 'reminder')
                ->exists();

            if ($alreadySent) {
                continue;
            }

            AppNotification::create([
                'user_id' => $appointment->patient_id,
                'appointment_id' => $appointment->id,
                'type' => 'reminder',
                'message' => "Reminder: Your appointment with {$appointment->doctor->user->name} is coming up at {$appointment->slot_time}. Please arrive at the clinic.",
            ]);

            $count++;
        }

        $this->info("Sent {$count} reminder notification(s).");

        return Command::SUCCESS;
    }
}
