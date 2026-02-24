<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        //
    ];

    protected function schedule(Schedule $schedule): void
    {
        // Process subscriptions that have expired past grace period - run daily at 2 AM
        $schedule->command('subscriptions:process-expired')->dailyAt('02:00');

        // Auto-renew subscriptions due for renewal - run daily at 3 AM
        $schedule->command('subscriptions:auto-renew')->dailyAt('03:00');
    }

    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}

