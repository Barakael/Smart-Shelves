<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Command;

class CheckSubscriptionStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscription:check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and update subscription statuses for all rooms';

    protected $subscriptionService;

    /**
     * Create a new command instance.
     */
    public function __construct(SubscriptionService $subscriptionService)
    {
        parent::__construct();
        $this->subscriptionService = $subscriptionService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking subscription statuses...');

        $results = $this->subscriptionService->checkExpiredSubscriptions();

        $this->info("Moved to grace period: {$results['moved_to_grace']}");
        $this->info("Expired: {$results['expired']}");
        $this->info('Subscription check completed.');

        return 0;
    }
}
