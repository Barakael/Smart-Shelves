<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Room;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    protected $subscriptionService;

    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }

    /**
     * Get the subscription status for the current user's room.
     */
    public function myStatus(Request $request)
    {
        $user = $request->user();
        $details = $this->subscriptionService->getSubscriptionDetails($user);

        return response()->json($details);
    }

    /**
     * Get subscription status for a specific room (admin only).
     */
    public function roomStatus(Request $request, Room $room)
    {
        $subscription = $room->subscription()->with('plan')->first();

        if (!$subscription) {
            return response()->json([
                'status' => 'none',
                'room_name' => $room->name,
                'message' => 'No subscription found for this room',
            ]);
        }

        return response()->json([
            'status' => $subscription->status,
            'room_name' => $room->name,
            'expires_at' => $subscription->ends_at->toIso8601String(),
            'grace_ends_at' => $subscription->grace_ends_at?->toIso8601String(),
            'days_remaining' => $subscription->daysRemaining(),
            'plan' => [
                'id' => $subscription->plan->id,
                'name' => $subscription->plan->name,
                'price' => $subscription->plan->price,
                'period_days' => $subscription->plan->period_days,
            ],
        ]);
    }

    /**
     * Create a new subscription for a room (admin only).
     */
    public function create(Request $request)
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'plan_id' => 'required|exists:plans,id',
            'start_date' => 'nullable|date',
        ]);

        $room = Room::findOrFail($validated['room_id']);
        $plan = Plan::findOrFail($validated['plan_id']);
        
        $startDate = $validated['start_date'] 
            ? \Carbon\Carbon::parse($validated['start_date']) 
            : null;

        $subscription = $this->subscriptionService->createSubscription($room, $plan, $startDate);

        return response()->json([
            'message' => 'Subscription created successfully',
            'subscription' => $subscription->load('plan'),
        ], 201);
    }
}
