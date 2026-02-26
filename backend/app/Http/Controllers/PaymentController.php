<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Room;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    protected $subscriptionService;

    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }

    /**
     * List all payments with optional filters (admin only).
     */
    public function index(Request $request)
    {
        $query = Payment::with(['room', 'subscription', 'confirmedBy']);

        // Apply filters
        if ($request->has('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('from_date')) {
            $query->where('paid_at', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->where('paid_at', '<=', $request->to_date);
        }

        $payments = $query->orderBy('paid_at', 'desc')->paginate(20);

        return response()->json($payments);
    }

    /**
     * Create a new payment record (admin only).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'payment_method' => 'required|in:manual,cash,bank_transfer',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'paid_at' => 'nullable|date',
        ]);

        $validated['paid_at'] = $validated['paid_at'] ?? now();
        $validated['status'] = 'pending';

        $payment = Payment::create($validated);

        return response()->json([
            'message' => 'Payment recorded successfully',
            'payment' => $payment->load('room'),
        ], 201);
    }

    /**
     * Confirm a payment and create/renew subscription (admin only).
     */
    public function confirm(Request $request, Payment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending payments can be confirmed',
            ], 400);
        }

        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $plan = Plan::findOrFail($validated['plan_id']);
        $room = $payment->room;

        // Check if room has an existing active subscription
        $existingSubscription = $room->subscription()->first();

        if ($existingSubscription && ($existingSubscription->isActive() || $existingSubscription->isInGracePeriod())) {
            // Renew existing subscription
            $subscription = $this->subscriptionService->renewSubscription($existingSubscription);
        } else {
            // Create new subscription
            $subscription = $this->subscriptionService->createSubscription($room, $plan);
        }

        // Link payment to subscription and mark as confirmed
        $payment->subscription_id = $subscription->id;
        $payment->markConfirmed($request->user()->id);

        return response()->json([
            'message' => 'Payment confirmed and subscription updated',
            'payment' => $payment->load(['room', 'subscription']),
            'subscription' => $subscription->load('plan'),
        ]);
    }

    /**
     * Reject a payment (admin only).
     */
    public function reject(Request $request, Payment $payment)
    {
        if ($payment->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending payments can be rejected',
            ], 400);
        }

        $payment->markRejected();

        return response()->json([
            'message' => 'Payment rejected',
            'payment' => $payment,
        ]);
    }

    /**
     * Get payment history for a specific room.
     */
    public function roomPayments(Request $request, Room $room)
    {
        // Allow room operators to view their own room's payments
        $user = $request->user();
        
        if (!$user->isAdmin() && $user->room_id !== $room->id) {
            return response()->json([
                'message' => 'Unauthorized to view this room\'s payments',
            ], 403);
        }

        $payments = $room->payments()
            ->with(['subscription', 'confirmedBy'])
            ->orderBy('paid_at', 'desc')
            ->get();

        return response()->json($payments);
    }
}
