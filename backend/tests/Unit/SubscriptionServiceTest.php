<?php

namespace Tests\Unit;

use App\Models\Room;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use Carbon\Carbon;
use Tests\TestCase;

class SubscriptionServiceTest extends TestCase
{
    private SubscriptionService $service;
    private SubscriptionPlan $plan;
    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new SubscriptionService();
        
        // Create a subscription plan
        $this->plan = SubscriptionPlan::factory()->create([
            'name' => 'Test Plan',
            'period_days' => 365,
            'price' => 99.99,
        ]);

        // Create a room
        $this->room = Room::factory()->create();
    }

    public function test_activate_subscription_creates_subscription(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);

        $this->assertInstanceOf(Subscription::class, $subscription);
        $this->assertEquals($this->room->id, $subscription->room_id);
        $this->assertEquals($this->plan->id, $subscription->plan_id);
        $this->assertEquals('active', $subscription->status);
        $this->assertTrue($subscription->isActive());
    }

    public function test_activate_subscription_sets_correct_end_date(): void
    {
        $before = Carbon::now()->addDays(365);
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        $after = Carbon::now()->addDays(365);

        $this->assertTrue($subscription->ends_at->between($before, $after));
    }

    public function test_renew_subscription_extends_end_date(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        $oldEndsAt = $subscription->ends_at;

        // Simulate some time passing
        $subscription->update(['ends_at' => Carbon::now()->addDays(10)]);

        $renewed = $this->service->renewSubscription($subscription);

        $this->assertGreaterThan($oldEndsAt, $renewed->ends_at);
        $this->assertEquals('active', $renewed->status);
    }

    public function test_subscription_is_not_active_when_expired(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        $subscription->update(['ends_at' => Carbon::now()->subDays(1)]);

        $this->assertFalse($subscription->isActive());
        $this->assertTrue($subscription->isExpired());
    }

    public function test_subscription_is_in_grace_period(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        // Mark as expired but within grace period
        $subscription->update(['ends_at' => Carbon::now()->subDays(3)]);

        $this->assertTrue($subscription->isInGracePeriod());
        $this->assertGreaterThan(0, $subscription->daysRemainingInGracePeriod());
    }

    public function test_subscription_is_not_in_grace_period_after_7_days(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        // Mark as expired and past grace period
        $subscription->update(['ends_at' => Carbon::now()->subDays(8)]);

        $this->assertFalse($subscription->isInGracePeriod());
    }

    public function test_expire_subscription_updates_status(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        
        $expired = $this->service->expireSubscription($subscription);

        $this->assertEquals('expired', $expired->status);
    }

    public function test_cancel_subscription_updates_status(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        
        $cancelled = $this->service->cancelSubscription($subscription);

        $this->assertEquals('cancelled', $cancelled->status);
    }

    public function test_update_room_subscription_status_active(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        $this->room->refresh();

        $this->assertEquals('active', $this->room->subscription_status);
    }

    public function test_update_room_subscription_status_grace_period(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        $subscription->update(['ends_at' => Carbon::now()->subDays(3)]);

        $this->service->updateRoomSubscriptionStatus($this->room);
        $this->room->refresh();

        $this->assertEquals('grace_period', $this->room->subscription_status);
    }

    public function test_update_room_subscription_status_expired(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        $subscription->update(['ends_at' => Carbon::now()->subDays(30)]);

        $this->service->updateRoomSubscriptionStatus($this->room);
        $this->room->refresh();

        $this->assertEquals('expired', $this->room->subscription_status);
    }

    public function test_get_subscription_details(): void
    {
        $subscription = $this->service->activateSubscription($this->room, $this->plan->id);
        
        $details = $this->service->getSubscriptionDetails($subscription);

        $this->assertIsArray($details);
        $this->assertEquals($subscription->id, $details['id']);
        $this->assertEquals($this->room->id, $details['room_id']);
        $this->assertEquals($this->plan->id, $details['plan']['id']);
        $this->assertTrue($details['is_active']);
    }
}
