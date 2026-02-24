<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Command;

class ProcessExpiredSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:process-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process subscriptions that have expired past the grace period';

    /**
     * Execute the console command.
     */
    public function handle(SubscriptionService $subscriptionService): int
    {
        $this->info('Processing expired subscriptions past grace period...');

        $subscriptions = $subscriptionService->getSubscriptionsToDeactivate();

        if ($subscriptions->isEmpty()) {
            $this->info('No expired subscriptions to process.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($subscriptions as $subscription) {
            $subscriptionService->expireSubscription($subscription);
            $this->line("  ✓ Expired subscription {$subscription->id} for room '{$subscription->room->name}'");
            $count++;
        }

        $this->info("{$count} subscription(s) processed successfully.");

        return self::SUCCESS;
    }
}
