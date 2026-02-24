<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Command;

class RenewAutoRenewingSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:auto-renew';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically renew subscriptions that are due for renewal';

    /**
     * Execute the console command.
     */
    public function handle(SubscriptionService $subscriptionService): int
    {
        $this->info('Processing auto-renewal subscriptions...');

        $subscriptions = $subscriptionService->getSubscriptionsToAutoRenew();

        if ($subscriptions->isEmpty()) {
            $this->info('No subscriptions due for renewal.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($subscriptions as $subscription) {
            $subscriptionService->renewSubscription($subscription);
            $this->line("  ✓ Renewed subscription {$subscription->id} for room '{$subscription->room->name}'");
            $this->line("    New expiration date: {$subscription->ends_at->toDateString()}");
            $count++;
        }

        $this->info("{$count} subscription(s) renewed successfully.");

        return self::SUCCESS;
    }
}
