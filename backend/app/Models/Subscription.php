<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use HasFactory;

    protected $table = 'subscriptions';

    protected $fillable = [
        'room_id',
        'plan_id',
        'status',
        'starts_at',
        'ends_at',
        'renewed_at',
        'renewal_due_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'renewed_at' => 'datetime',
        'renewal_due_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the room this subscription belongs to.
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Get the plan for this subscription.
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    /**
     * Check if subscription is currently active (not expired).
     */
    public function isActive(): bool
    {
        return $this->status === 'active' && $this->ends_at->isFuture();
    }

    /**
     * Check if subscription has expired.
     */
    public function isExpired(): bool
    {
        return $this->status === 'expired' || $this->ends_at->isPast();
    }

    /**
     * Check if subscription is in grace period (expired but within 7 days).
     */
    public function isInGracePeriod(): bool
    {
        if (!$this->isExpired()) {
            return false;
        }

        $gracePeriodEnd = $this->ends_at->copy()->addDays(7);
        return Carbon::now()->isBefore($gracePeriodEnd);
    }

    /**
     * Get days remaining until expiration (negative if expired).
     */
    public function daysUntilExpiration(): int
    {
        return Carbon::now()->diffInDays($this->ends_at, false);
    }

    /**
     * Get days remaining in grace period (0 if not in grace period).
     */
    public function daysRemainingInGracePeriod(): int
    {
        if (!$this->isInGracePeriod()) {
            return 0;
        }

        $gracePeriodEnd = $this->ends_at->copy()->addDays(7);
        return max(0, Carbon::now()->diffInDays($gracePeriodEnd, false));
    }

    /**
     * Check if subscription should be auto-renewed soon.
     */
    public function shouldAutoRenew(): bool
    {
        return $this->renewal_due_at && Carbon::now()->isAfter($this->renewal_due_at);
    }
}
