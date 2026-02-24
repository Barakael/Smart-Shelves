<?php

namespace App\Services;

use App\Models\Room;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use Carbon\Carbon;
use Exception;

class SubscriptionService
{
    /**
     * The grace period in days after expiration before full access block.
     */
    private const GRACE_PERIOD_DAYS = 7;

    /**
     * Activate a subscription for a room.
     *
     * @param Room $room
     * @param int $planId
     * @return Subscription
     * @throws Exception
     */
    public function activateSubscription(Room $room, int $planId): Subscription
    {
        $plan = SubscriptionPlan::findOrFail($planId);

        // Cancel any existing subscription
        if ($room->subscription) {
            $this->cancelSubscription($room->subscription);
        }

        $now = Carbon::now();
        $endsAt = $now->copy()->addDays($plan->period_days);

        $subscription = Subscription::create([
            'room_id' => $room->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => $now,
            'ends_at' => $endsAt,
            'renewal_due_at' => $endsAt->copy()->subDays(30), // Renew 30 days before expiry
        ]);

        // Update room subscription status cache
        $this->updateRoomSubscriptionStatus($room);

        return $subscription;
    }

    /**
     * Renew a subscription by extending its end date.
     *
     * @param Subscription $subscription
     * @return Subscription
     */
    public function renewSubscription(Subscription $subscription): Subscription
    {
        $now = Carbon::now();
        $daysToAdd = $subscription->plan->period_days;
        $newEndsAt = $now->copy()->addDays($daysToAdd);

        $subscription->update([
            'status' => 'active',
            'renewed_at' => $now,
            'ends_at' => $newEndsAt,
            'renewal_due_at' => $newEndsAt->copy()->subDays(30),
        ]);

        // Update room subscription status cache
        $this->updateRoomSubscriptionStatus($subscription->room);

        return $subscription;
    }

    /**
     * Expire a subscription.
     *
     * @param Subscription $subscription
     * @return Subscription
     */
    public function expireSubscription(Subscription $subscription): Subscription
    {
        $subscription->update([
            'status' => 'expired',
        ]);

        // Update room subscription status cache
        $this->updateRoomSubscriptionStatus($subscription->room);

        return $subscription;
    }

    /**
     * Cancel a subscription.
     *
     * @param Subscription $subscription
     * @return Subscription
     */
    public function cancelSubscription(Subscription $subscription): Subscription
    {
        $subscription->update([
            'status' => 'cancelled',
        ]);

        // Update room subscription status cache
        $this->updateRoomSubscriptionStatus($subscription->room);

        return $subscription;
    }

    /**
     * Check and update subscription status for a room.
     * Updates the cached subscription_status field on the room based on actual subscription data.
     *
     * @param Room $room
     */
    public function updateRoomSubscriptionStatus(Room $room): void
    {
        $now = Carbon::now();

        if (!$room->subscription) {
            $room->update([
                'subscription_status' => 'no_subscription',
                'subscription_status_checked_at' => $now,
            ]);
            return;
        }

        $subscription = $room->subscription;

        if ($subscription->isActive()) {
            $status = 'active';
        } elseif ($subscription->isInGracePeriod()) {
            $status = 'grace_period';
        } else {
            $status = 'expired';
        }

        $room->update([
            'subscription_status' => $status,
            'subscription_status_checked_at' => $now,
        ]);
    }

    /**
     * Ensure a room has an active subscription (allows grace period).
     *
     * @param Room $room
     * @throws Exception
     */
    public function ensureActiveSubscription(Room $room): void
    {
        // Refresh status cache if older than 1 hour
        if (!$room->subscription_status_checked_at || 
            $room->subscription_status_checked_at->diffInHours(Carbon::now()) > 1) {
            $this->updateRoomSubscriptionStatus($room);
            $room->refresh();
        }

        if ($room->subscription_status === 'no_subscription') {
            throw new Exception('No active subscription found for this room.', 403);
        }

        if ($room->subscription_status === 'expired') {
            throw new Exception('Subscription has expired.', 403);
        }

        // Grace period is allowed but could warn
        if ($room->subscription_status === 'grace_period') {
            $daysRemaining = $room->subscription->daysRemainingInGracePeriod();
            throw new Exception(
                "Subscription expired. Grace period: {$daysRemaining} days remaining.",
                402
            );
        }
    }

    /**
     * Check if room is in grace period.
     *
     * @param Room $room
     * @return bool
     */
    public function isInGracePeriod(Room $room): bool
    {
        return $room->subscription_status === 'grace_period';
    }

    /**
     * Get days remaining in grace period (0 if not in grace period).
     *
     * @param Room $room
     * @return int
     */
    public function daysRemainingInGracePeriod(Room $room): int
    {
        if (!$room->subscription || !$room->subscription->isInGracePeriod()) {
            return 0;
        }

        return $room->subscription->daysRemainingInGracePeriod();
    }

    /**
     * Get all rooms expiring soon (within next 30 days).
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getRoomsExpiringSoon()
    {
        $now = Carbon::now();
        $thirtyDaysFromNow = $now->copy()->addDays(30);

        return Room::whereHas('subscription', function ($query) use ($now, $thirtyDaysFromNow) {
            $query->where('status', 'active')
                ->whereBetween('ends_at', [$now, $thirtyDaysFromNow]);
        })->with('subscription.plan')->get();
    }

    /**
     * Get all subscriptions that should auto-renew.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getSubscriptionsToAutoRenew()
    {
        return Subscription::where('status', 'active')
            ->where('renewal_due_at', '<=', Carbon::now())
            ->with('room', 'plan')
            ->get();
    }

    /**
     * Get all expired subscriptions past grace period that need to be deactivated.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getSubscriptionsToDeactivate()
    {
        $gracePeriodEnd = Carbon::now()->subDays(self::GRACE_PERIOD_DAYS);

        return Subscription::where('status', 'active')
            ->where('ends_at', '<', $gracePeriodEnd)
            ->with('room')
            ->get();
    }

    /**
     * Get subscription details for response.
     *
     * @param Subscription $subscription
     * @return array
     */
    public function getSubscriptionDetails(Subscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'room_id' => $subscription->room_id,
            'plan' => [
                'id' => $subscription->plan->id,
                'name' => $subscription->plan->name,
                'price' => $subscription->plan->price,
                'period_days' => $subscription->plan->period_days,
                'features' => $subscription->plan->features,
            ],
            'status' => $subscription->status,
            'starts_at' => $subscription->starts_at->toIso8601String(),
            'ends_at' => $subscription->ends_at->toIso8601String(),
            'renewed_at' => $subscription->renewed_at?->toIso8601String(),
            'renewal_due_at' => $subscription->renewal_due_at?->toIso8601String(),
            'is_active' => $subscription->isActive(),
            'is_expired' => $subscription->isExpired(),
            'is_in_grace_period' => $subscription->isInGracePeriod(),
            'days_until_expiration' => $subscription->daysUntilExpiration(),
            'days_remaining_in_grace_period' => $subscription->daysRemainingInGracePeriod(),
        ];
    }
}
