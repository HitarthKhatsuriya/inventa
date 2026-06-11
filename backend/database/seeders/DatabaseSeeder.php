<?php

namespace Database\Seeders;

use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\DoctorSlot;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ── Admin Account ──────────────────────────────────────────────
        User::create([
            'name' => 'Admin',
            'email' => 'admin@mediq.com',
            'password' => 'password123',
            'phone' => '+919876543210',
            'role' => 'admin',
        ]);

        // ── Sample Doctors ─────────────────────────────────────────────
        $doctors = [
            [
                'name' => 'Dr. Priya Sharma',
                'email' => 'priya@mediq.com',
                'specialization' => 'General Medicine',
                'bio' => 'MBBS, MD — 12 years of experience in internal medicine and primary care.',
            ],
            [
                'name' => 'Dr. Rahul Patel',
                'email' => 'rahul@mediq.com',
                'specialization' => 'Pediatrics',
                'bio' => 'DCH, MD Pediatrics — Specialist in child healthcare and vaccination programs.',
            ],
            [
                'name' => 'Dr. Ananya Desai',
                'email' => 'ananya@mediq.com',
                'specialization' => 'Dermatology',
                'bio' => 'MD Dermatology — Expert in skin conditions, cosmetic dermatology, and laser treatments.',
            ],
            [
                'name' => 'Dr. Vikram Singh',
                'email' => 'vikram@mediq.com',
                'specialization' => 'Orthopedics',
                'bio' => 'MS Ortho, Fellowship in Sports Medicine — Joint replacement and sports injury specialist.',
            ],
        ];

        foreach ($doctors as $doc) {
            $user = User::create([
                'name' => $doc['name'],
                'email' => $doc['email'],
                'password' => 'password123',
                'phone' => '+919876543' . rand(100, 999),
                'role' => 'doctor',
            ]);

            $doctor = Doctor::create([
                'user_id' => $user->id,
                'specialization' => $doc['specialization'],
                'bio' => $doc['bio'],
                'avg_consultation_minutes' => 15,
            ]);

            // Create slots for Monday-Saturday (1-6)
            for ($day = 1; $day <= 6; $day++) {
                // Morning slot
                DoctorSlot::create([
                    'doctor_id' => $doctor->id,
                    'day_of_week' => $day,
                    'start_time' => '09:00',
                    'end_time' => '13:00',
                    'max_patients' => 20,
                ]);

                // Afternoon slot
                DoctorSlot::create([
                    'doctor_id' => $doctor->id,
                    'day_of_week' => $day,
                    'start_time' => '14:00',
                    'end_time' => '18:00',
                    'max_patients' => 15,
                ]);
            }
        }

        // ── Sample Patient Accounts ────────────────────────────────────
        $patients = [
            ['name' => 'Amit Kumar', 'email' => 'amit@example.com'],
            ['name' => 'Sneha Reddy', 'email' => 'sneha@example.com'],
            ['name' => 'Rajesh Gupta', 'email' => 'rajesh@example.com'],
        ];

        foreach ($patients as $pat) {
            User::create([
                'name' => $pat['name'],
                'email' => $pat['email'],
                'password' => 'password123',
                'phone' => '+919876' . rand(100000, 999999),
                'role' => 'patient',
            ]);
        }

        // ── Default Clinic Settings ────────────────────────────────────
        ClinicSetting::setValue('no_show_grace_minutes', '15');
        ClinicSetting::setValue('clinic_start_time', '09:00');
        ClinicSetting::setValue('clinic_end_time', '18:00');
        ClinicSetting::setValue('clinic_name', 'MEDIQ Healthcare Clinic');
    }
}
