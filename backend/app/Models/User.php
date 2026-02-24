<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'room_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function rooms()
    {
        return $this->belongsToMany(Room::class, 'user_rooms');
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isOperator(): bool
    {
        return $this->role === 'operator';
    }

    /**
     * Check if user's room has an active subscription.
     */
    public function hasActiveSubscription(): bool
    {
        $room = $this->room;
        
        if (!$room) {
            return false;
        }

        return $room->subscription_status === 'active';
    }

    /**
     * Check if user's room subscription is in grace period.
     */
    public function isInSubscriptionGracePeriod(): bool
    {
        $room = $this->room;
        
        if (!$room) {
            return false;
        }

        return $room->subscription_status === 'grace_period';
    }

    /**
     * Get days remaining in user's subscription.
     */
    public function subscriptionDaysRemaining(): ?int
    {
        $room = $this->room;
        
        if (!$room || !$room->subscription) {
            return null;
        }

        return $room->subscription->daysUntilExpiration();
    }

    /**
     * Get subscription details for user (for return in API response).
     */
    public function getSubscriptionStatus(): array
    {
        $room = $this->room;
        
        if (!$room) {
            return [
                'status' => 'no_room',
                'message' => 'User has no room assignment.',
            ];
        }

        if (!$room->subscription) {
            return [
                'status' => 'no_subscription',
                'message' => 'Room has no active subscription.',
            ];
        }

        return [
            'status' => $room->subscription_status,
            'days_remaining' => $room->subscription->daysUntilExpiration(),
            'expires_at' => $room->subscription->ends_at->toIso8601String(),
            'is_in_grace_period' => $room->subscription->isInGracePeriod(),
            'plan_name' => $room->subscription->plan->name,
        ];
    }
}

