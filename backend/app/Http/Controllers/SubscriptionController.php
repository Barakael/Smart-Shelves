<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(private SubscriptionService $subscriptionService)
    {
    }

    /**
     * Activate a subscription for a room.
     *
     * @param Request $request
     * @param int $roomId
     * @return JsonResponse
     */
    public function activateSubscription(Request $request, int $roomId): JsonResponse
    {
        $room = Room::findOrFail($roomId);

        $validated = $request->validate([
            'plan_id' => 'required|exists:subscription_plans,id',
        ]);

        $subscription = $this->subscriptionService->activateSubscription($room, $validated['plan_id']);

        return response()->json([
            'message' => 'Subscription activated successfully.',
            'subscription' => $this->subscriptionService->getSubscriptionDetails($subscription),
        ], 201);
    }

    /**
     * Get current subscription for a room.
     *
     * @param int $roomId
     * @return JsonResponse
     */
    public function getSubscription(int $roomId): JsonResponse
    {
        $room = Room::findOrFail($roomId);
        $subscription = $room->subscription;

        if (!$subscription) {
            return response()->json([
                'message' => 'No subscription found for this room.',
                'subscription' => null,
            ], 404);
        }

        return response()->json([
            'subscription' => $this->subscriptionService->getSubscriptionDetails($subscription),
        ], 200);
    }

    /**
     * Renew a subscription for a room.
     *
     * @param int $roomId
     * @return JsonResponse
     */
    public function renewSubscription(int $roomId): JsonResponse
    {
        $room = Room::findOrFail($roomId);
        $subscription = $room->subscription;

        if (!$subscription) {
            return response()->json([
                'message' => 'No subscription found for this room.',
            ], 404);
        }

        $renewed = $this->subscriptionService->renewSubscription($subscription);

        return response()->json([
            'message' => 'Subscription renewed successfully.',
            'subscription' => $this->subscriptionService->getSubscriptionDetails($renewed),
        ], 200);
    }

    /**
     * Cancel a subscription for a room.
     *
     * @param int $roomId
     * @return JsonResponse
     */
    public function cancelSubscription(int $roomId): JsonResponse
    {
        $room = Room::findOrFail($roomId);
        $subscription = $room->subscription;

        if (!$subscription) {
            return response()->json([
                'message' => 'No subscription found for this room.',
            ], 404);
        }

        $cancelled = $this->subscriptionService->cancelSubscription($subscription);

        return response()->json([
            'message' => 'Subscription cancelled successfully.',
            'subscription' => $this->subscriptionService->getSubscriptionDetails($cancelled),
        ], 200);
    }

    /**
     * Get subscription overview dashboard (all rooms with their subscription status).
     *
     * @return JsonResponse
     */
    public function getOverview(): JsonResponse
    {
        $rooms = Room::with('subscription.plan')->get();

        $overview = [
            'total_rooms' => $rooms->count(),
            'active_subscriptions' => 0,
            'grace_period_subscriptions' => 0,
            'expired_subscriptions' => 0,
            'no_subscription' => 0,
            'rooms' => [],
        ];

        foreach ($rooms as $room) {
            $this->subscriptionService->updateRoomSubscriptionStatus($room);
            $room->refresh();

            $roomData = [
                'id' => $room->id,
                'name' => $room->name,
                'subscription_status' => $room->subscription_status,
                'subscription' => null,
            ];

            if ($room->subscription) {
                $roomData['subscription'] = $this->subscriptionService->getSubscriptionDetails($room->subscription);
            }

            $overview['rooms'][] = $roomData;

            match ($room->subscription_status) {
                'active' => $overview['active_subscriptions']++,
                'grace_period' => $overview['grace_period_subscriptions']++,
                'expired' => $overview['expired_subscriptions']++,
                'no_subscription' => $overview['no_subscription']++,
                default => null,
            };
        }

        return response()->json($overview, 200);
    }

    /**
     * Get subscriptions expiring soon (within next 30 days).
     *
     * @return JsonResponse
     */
    public function getExpiringsSoon(): JsonResponse
    {
        $rooms = $this->subscriptionService->getRoomsExpiringSoon();

        $data = $rooms->map(function ($room) {
            return [
                'id' => $room->id,
                'name' => $room->name,
                'subscription' => $this->subscriptionService->getSubscriptionDetails($room->subscription),
            ];
        });

        return response()->json([
            'expiring_soon_count' => $data->count(),
            'rooms' => $data,
        ], 200);
    }

    /**
     * Get available subscription plans.
     *
     * @return JsonResponse
     */
    public function getAvailablePlans(): JsonResponse
    {
        $plans = SubscriptionPlan::where('is_active', true)->get();

        return response()->json([
            'plans' => $plans,
        ], 200);
    }

    /**
     * Get current user's subscription status for their primary room.
     *
     * @return JsonResponse
     */
    public function getMySubscriptionStatus(): JsonResponse
    {
        $user = auth()->user();

        // Get user's primary room or first accessible room
        $room = null;
        if ($user->room_id) {
            $room = Room::find($user->room_id)?->load('subscription.plan');
        } else {
            $room = $user->rooms()->with('subscription.plan')->first();
        }

        if (!$room) {
            return response()->json([
                'subscription_status' => 'no_room',
                'message' => 'You have not been assigned to any room',
            ], 200);
        }

        // Refresh subscription status cache
        $this->subscriptionService->updateRoomSubscriptionStatus($room);
        $room = $room->fresh(['subscription.plan']);

        return response()->json([
            'room_id' => $room->id,
            'room_name' => $room->name,
            'subscription_status' => $room->subscription_status,
            'subscription' => $room->subscription ? [
                'id' => $room->subscription->id,
                'status' => $room->subscription->status,
                'plan_name' => $room->subscription->plan->name ?? 'Unknown',
                'plan_price' => $room->subscription->plan->price ?? 0,
                'starts_at' => $room->subscription->starts_at,
                'ends_at' => $room->subscription->ends_at,
                'days_remaining' => $room->subscription->daysUntilExpiration(),
                'is_in_grace_period' => $room->subscription->isInGracePeriod(),
                'grace_period_days_left' => $room->subscription->daysRemainingInGracePeriod(),
            ] : [
                'status' => 'no_subscription',
                'message' => 'This room has no active subscription',
            ],
        ], 200);
    }
}
