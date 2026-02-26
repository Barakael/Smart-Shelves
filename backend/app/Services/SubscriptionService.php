<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;

class SubscriptionService
{
    /**
     * Update the subscription status for a room based on its current subscription.
     */
    public function updateRoomSubscriptionStatus(Room $room): void
    {
        $room->updateSubscriptionStatus();
    }

    /**
     * Create a new subscription for a room.
     */
    public function createSubscription(
        Room $room, 
        Plan $plan, 
        ?Carbon $startDate = null
    ): Subscription {
        $startDate = $startDate ?? now();
        $endDate = $startDate->copy()->addDays($plan->period_days);
        $graceEndDate = $endDate->copy()->addDays(7); // 7-day grace period

        $subscription = Subscription::create([
            'room_id' => $room->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => $startDate,
            'ends_at' => $endDate,
            'grace_ends_at' => $graceEndDate,
            'auto_renew' => false,
        ]);

        // Update room status
        $this->updateRoomSubscriptionStatus($room);

        return $subscription;
    }

    /**
     * Renew an existing subscription by extending it.
     */
    public function renewSubscription(Subscription $subscription): Subscription
    {
        $plan = $subscription->plan;
        
        // Extend from the current end date or now, whichever is later
        $newStartDate = $subscription->ends_at->isFuture() 
            ? $subscription->ends_at 
            : now();

        $subscription->ends_at = $newStartDate->copy()->addDays($plan->period_days);
        $subscription->grace_ends_at = $subscription->ends_at->copy()->addDays(7);
        $subscription->status = 'active';
        $subscription->save();

        // Update room status
        $this->updateRoomSubscriptionStatus($subscription->room);

        return $subscription;
    }

    /**
     * Check all subscriptions and update their status as needed.
     * This should be run as a scheduled task.
     */
    public function checkExpiredSubscriptions(): array
    {
        $results = [
            'moved_to_grace' => 0,
            'expired' => 0,
        ];

        // Find active subscriptions that have passed their end date
        $expiredActive = Subscription::where('status', 'active')
            ->where('ends_at', '<=', now())
            ->get();

        foreach ($expiredActive as $subscription) {
            $subscription->status = 'grace_period';
            $subscription->save();
            $this->updateRoomSubscriptionStatus($subscription->room);
            $results['moved_to_grace']++;
        }

        // Find grace period subscriptions that have passed their grace end date
        $expiredGrace = Subscription::where('status', 'grace_period')
            ->where('grace_ends_at', '<=', now())
            ->get();

        foreach ($expiredGrace as $subscription) {
            $subscription->status = 'expired';
            $subscription->save();
            $this->updateRoomSubscriptionStatus($subscription->room);
            $results['expired']++;
        }

        return $results;
    }

    /**
     * Check if a user can access the system based on subscription status.
     * Admins are always allowed. Operators need active or grace period subscription.
     */
    public function canAccessSystem(User $user): bool
    {
        // Admins always have access
        if ($user->isAdmin()) {
            return true;
        }

        // Operators need a room with active subscription
        if (!$user->room_id) {
            return false; // No room assigned
        }

        $room = Room::find($user->room_id);
        
        if (!$room) {
            return false;
        }

        return $room->hasActiveSubscription();
    }

    /**
     * Get subscription details for a user's room.
     */
    public function getSubscriptionDetails(User $user): ?array
    {
        if ($user->isAdmin()) {
            return [
                'is_admin_exempt' => true,
                'status' => 'exempt',
                'message' => 'Admin users are exempt from subscription requirements',
            ];
        }

        if (!$user->room_id) {
            return [
                'is_admin_exempt' => false,
                'status' => 'none',
                'message' => 'No room assigned',
            ];
        }

        $room = Room::with('subscription.plan')->find($user->room_id);
        
        if (!$room) {
            return null;
        }

        $subscription = $room->subscription;

        if (!$subscription) {
            return [
                'is_admin_exempt' => false,
                'status' => 'none',
                'room_name' => $room->name,
                'message' => 'No subscription found for this room',
            ];
        }

        return [
            'is_admin_exempt' => false,
            'status' => $subscription->status,
            'room_name' => $room->name,
            'expires_at' => $subscription->ends_at->toIso8601String(),
            'grace_ends_at' => $subscription->grace_ends_at?->toIso8601String(),
            'days_remaining' => $subscription->daysRemaining(),
            'plan' => [
                'name' => $subscription->plan->name,
                'period_days' => $subscription->plan->period_days,
            ],
        ];
    }
}
