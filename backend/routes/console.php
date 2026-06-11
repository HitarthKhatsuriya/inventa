<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ── MEDIQ Scheduled Tasks ──────────────────────────────────────────────

// Detect no-show patients every 5 minutes during clinic hours
Schedule::command('mediq:detect-no-shows')
    ->everyFiveMinutes()
    ->between('09:00', '19:00')
    ->withoutOverlapping();

// Send appointment reminders every 10 minutes during clinic hours
Schedule::command('mediq:send-reminders')
    ->everyTenMinutes()
    ->between('08:00', '18:00')
    ->withoutOverlapping();
