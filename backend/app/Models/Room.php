<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'subscription_status',
        'subscription_expires_at',
    ];

    protected $casts = [
        'subscription_expires_at' => 'datetime',
    ];

    public function shelves()
    {
        return $this->hasMany(Shelf::class);
    }

    public function panels()
    {
        return $this->hasMany(Panel::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_rooms');
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Get the current active subscription for this room.
     */
    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    /**
     * Get all subscriptions for this room.
     */
    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Get all payments for this room.
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Check if the room has an active subscription.
     */
    public function hasActiveSubscription(): bool
    {
        return $this->subscription_status === 'active' || 
               $this->subscription_status === 'grace_period';
    }

    /**
     * Check if the room is in grace period.
     */
    public function isInGracePeriod(): bool
    {
        return $this->subscription_status === 'grace_period';
    }

    /**
     * Update the subscription status based on the current subscription.
     */
    public function updateSubscriptionStatus(): void
    {
        $subscription = $this->subscription()->first();

        if (!$subscription) {
            $this->subscription_status = 'none';
            $this->subscription_expires_at = null;
        } elseif ($subscription->isActive()) {
            $this->subscription_status = 'active';
            $this->subscription_expires_at = $subscription->ends_at;
        } elseif ($subscription->isInGracePeriod()) {
            $this->subscription_status = 'grace_period';
            $this->subscription_expires_at = $subscription->grace_ends_at;
        } else {
            $this->subscription_status = 'expired';
            $this->subscription_expires_at = $subscription->ends_at;
        }

        $this->save();
    }
}

