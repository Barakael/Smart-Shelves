<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'room_id' => $user->room_id,
            ],
        ]);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        
        // Get current room subscription status
        $currentRoom = null;
        if ($user->room_id) {
            $currentRoom = Room::find($user->room_id)?->load('subscription.plan');
        } else {
            // Fall back to first room user has access to
            $currentRoom = $user->rooms()->with('subscription.plan')->first();
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'room_id' => $user->room_id,
            'is_admin' => $user->is_admin,
            'current_room' => $currentRoom ? [
                'id' => $currentRoom->id,
                'name' => $currentRoom->name,
                'subscription_status' => $currentRoom->subscription_status,
                'subscription' => $currentRoom->subscription ? [
                    'status' => $currentRoom->subscription->status,
                    'plan_name' => $currentRoom->subscription->plan->name ?? 'Unknown',
                    'ends_at' => $currentRoom->subscription->ends_at,
                    'days_remaining' => $currentRoom->subscription->daysUntilExpiration(),
                ] : null,
            ] : null,
        ]);
    }

    public function getAccessibleRooms(): JsonResponse
    {
        $user = auth()->user();
        $subscriptionService = app(SubscriptionService::class);

        // Admins can see all rooms; operators see only their primary room
        if ($user->is_admin) {
            $rooms = Room::with('subscription.plan')
                ->orderBy('name')
                ->get();
        } else {
            // Operators only see their primary room (room_id)
            $rooms = Room::with('subscription.plan')
                ->where('id', $user->room_id)
                ->get();
        }

        // Map rooms with subscription details
        $roomData = $rooms->map(function (Room $room) use ($subscriptionService) {
            // Refresh subscription status cache
            $subscriptionService->updateRoomSubscriptionStatus($room);
            
            return [
                'id' => $room->id,
                'name' => $room->name,
                'location' => $room->location,
                'description' => $room->description,
                'subscription_status' => $room->subscription_status,
                'subscription' => $room->subscription ? [
                    'id' => $room->subscription->id,
                    'status' => $room->subscription->status,
                    'plan_id' => $room->subscription->plan_id,
                    'plan_name' => $room->subscription->plan->name ?? 'Unknown',
                    'plan_price' => $room->subscription->plan->price ?? 0,
                    'starts_at' => $room->subscription->starts_at,
                    'ends_at' => $room->subscription->ends_at,
                    'days_remaining' => $room->subscription->daysUntilExpiration(),
                    'is_in_grace_period' => $room->subscription->isInGracePeriod(),
                    'grace_period_days_left' => $room->subscription->daysRemainingInGracePeriod(),
                ] : null,
            ];
        });

        return response()->json([
            'rooms' => $roomData,
            'total_rooms' => $rooms->count(),
        ]);
    }

    public function getSubscriptionStatus(Room $room): JsonResponse
    {
        $user = auth()->user();

        // Check if user has access to this room
        // Admins can view any room; operators can only view their primary room
        if (!$user->is_admin && $user->room_id !== $room->id) {
            abort(403, 'Unauthorized to view this room\'s subscription');
        }

        $subscriptionService = app(SubscriptionService::class);
        
        // Refresh subscription status cache
        $subscriptionService->updateRoomSubscriptionStatus($room);
        
        // Reload room with fresh data
        $room = $room->fresh(['subscription.plan']);

        return response()->json([
            'room_id' => $room->id,
            'room_name' => $room->name,
            'subscription_status' => $room->subscription_status,
            'subscription' => $room->subscription ? [
                'id' => $room->subscription->id,
                'status' => $room->subscription->status,
                'plan_id' => $room->subscription->plan_id,
                'plan_name' => $room->subscription->plan->name ?? 'Unknown',
                'plan_price' => $room->subscription->plan->price ?? 0,
                'plan_period_days' => $room->subscription->plan->period_days ?? 365,
                'starts_at' => $room->subscription->starts_at,
                'ends_at' => $room->subscription->ends_at,
                'renewed_at' => $room->subscription->renewed_at,
                'renewal_due_at' => $room->subscription->renewal_due_at,
                'days_remaining' => $room->subscription->daysUntilExpiration(),
                'is_active' => $room->subscription->isActive(),
                'is_expired' => $room->subscription->isExpired(),
                'is_in_grace_period' => $room->subscription->isInGracePeriod(),
                'grace_period_days_left' => $room->subscription->daysRemainingInGracePeriod(),
                'should_auto_renew' => $room->subscription->shouldAutoRenew(),
            ] : [
                'status' => 'no_subscription',
                'message' => 'This room has no active subscription',
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'current_password' => 'required_with:new_password|string',
            'new_password' => 'nullable|string|min:6|confirmed',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (array_key_exists('phone', $validated)) {
            $user->phone = $validated['phone'];
        }

        if (!empty($validated['new_password'] ?? null)) {
            if (!Hash::check($validated['current_password'] ?? '', $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['The current password is incorrect.'],
                ]);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'room_id' => $user->room_id,
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }
}

