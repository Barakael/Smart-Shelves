<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\Carbon;
use Tests\TestCase;

class SubscriptionControllerTest extends TestCase
{
    private User $admin;
    private SubscriptionPlan $plan;
    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin user
        $this->admin = User::factory()->create(['role' => 'admin']);

        // Create a subscription plan
        $this->plan = SubscriptionPlan::factory()->create([
            'name' => 'Test Plan',
            'period_days' => 365,
            'price' => 99.99,
        ]);

        // Create a room
        $this->room = Room::factory()->create();
    }

    public function test_unauthorized_user_cannot_activate_subscription(): void
    {
        $operator = User::factory()->create(['role' => 'operator']);

        $response = $this->actingAs($operator, 'sanctum')
            ->postJson("/api/admin/rooms/{$this->room->id}/subscriptions", [
                'plan_id' => $this->plan->id,
            ]);

        $this->assertEquals(403, $response->status());
    }

    public function test_admin_can_activate_subscription(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/rooms/{$this->room->id}/subscriptions", [
                'plan_id' => $this->plan->id,
            ]);

        $this->assertEquals(201, $response->status());
        $this->assertJsonPath('subscription.room_id', $this->room->id);
        $this->assertJsonPath('subscription.is_active', true);
    }

    public function test_get_subscription_returns_404_when_no_subscription(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/rooms/{$this->room->id}/subscription");

        $this->assertEquals(404, $response->status());
    }

    public function test_get_subscription_returns_subscription_details(): void
    {
        // First activate a subscription
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/rooms/{$this->room->id}/subscriptions", [
                'plan_id' => $this->plan->id,
            ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/rooms/{$this->room->id}/subscription");

        $this->assertEquals(200, $response->status());
        $this->assertJsonPath('subscription.room_id', $this->room->id);
        $this->assertJsonPath('subscription.is_active', true);
    }

    public function test_admin_can_renew_subscription(): void
    {
        // Activate subscription
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/rooms/{$this->room->id}/subscriptions", [
                'plan_id' => $this->plan->id,
            ]);

        // Renew it
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/rooms/{$this->room->id}/subscription/renew");

        $this->assertEquals(200, $response->status());
        $this->assertJsonPath('subscription.is_active', true);
    }

    public function test_admin_can_cancel_subscription(): void
    {
        // Activate subscription
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/rooms/{$this->room->id}/subscriptions", [
                'plan_id' => $this->plan->id,
            ]);

        // Cancel it
        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/rooms/{$this->room->id}/subscription");

        $this->assertEquals(200, $response->status());
        $this->assertJsonPath('subscription.status', 'cancelled');
    }

    public function test_get_subscription_overview(): void
    {
        // Activate subscription for first room
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/rooms/{$this->room->id}/subscriptions", [
                'plan_id' => $this->plan->id,
            ]);

        // Create another room without subscription
        $room2 = Room::factory()->create();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/subscriptions/overview');

        $this->assertEquals(200, $response->status());
        $this->assertJsonPath('total_rooms', 2);
        $this->assertJsonPath('active_subscriptions', 1);
        $this->assertJsonPath('no_subscription', 1);
    }

    public function test_get_available_plans(): void
    {
        // Create an inactive plan
        SubscriptionPlan::factory()->create(['is_active' => false]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/subscriptions/plans');

        $this->assertEquals(200, $response->status());
        $this->assertGreaterThanOrEqual(1, count($response->json('plans')));
    }

    public function test_validate_subscription_middleware_blocks_expired_user(): void
    {
        $operator = User::factory()->create([
            'role' => 'operator',
            'room_id' => $this->room->id,
        ]);

        // Activate and then expire subscription
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/rooms/{$this->room->id}/subscriptions", [
                'plan_id' => $this->plan->id,
            ]);

        // Manually expire the subscription past grace period
        $subscription = $this->room->subscription;
        $subscription->update(['ends_at' => Carbon::now()->subDays(30)]);

        // Try to access protected endpoint
        $response = $this->actingAs($operator, 'sanctum')
            ->getJson('/api/user');

        $this->assertEquals(403, $response->status());
        $this->assertStringContainsString('expired', strtolower($response->json('message')));
    }

    public function test_validate_subscription_middleware_allows_active_user(): void
    {
        $operator = User::factory()->create([
            'role' => 'operator',
            'room_id' => $this->room->id,
        ]);

        // Activate subscription
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/rooms/{$this->room->id}/subscriptions", [
                'plan_id' => $this->plan->id,
            ]);

        // Try to access protected endpoint
        $response = $this->actingAs($operator, 'sanctum')
            ->getJson('/api/user');

        $this->assertEquals(200, $response->status());
    }
}
