<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'plan_id',
        'status',
        'starts_at',
        'ends_at',
        'grace_ends_at',
        'auto_renew',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'grace_ends_at' => 'datetime',
        'auto_renew' => 'boolean',
    ];

    /**
     * Get the room that owns the subscription.
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
        return $this->belongsTo(Plan::class);
    }

    /**
     * Get all payments for this subscription.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Check if the subscription is currently active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active' && $this->ends_at->isFuture();
    }

    /**
     * Check if the subscription is expired.
     */
    public function isExpired(): bool
    {
        return $this->status === 'expired' || 
               ($this->grace_ends_at && $this->grace_ends_at->isPast());
    }

    /**
     * Check if the subscription is in grace period.
     */
    public function isInGracePeriod(): bool
    {
        return $this->status === 'grace_period' && 
               $this->ends_at->isPast() && 
               ($this->grace_ends_at && $this->grace_ends_at->isFuture());
    }

    /**
     * Get the number of days remaining until expiration.
     */
    public function daysRemaining(): int
    {
        if ($this->ends_at->isPast()) {
            return 0;
        }
        return (int) now()->diffInDays($this->ends_at, false);
    }

    /**
     * Extend the subscription by the specified number of days.
     */
    public function extend(int $days): self
    {
        $this->ends_at = $this->ends_at->addDays($days);
        $this->grace_ends_at = $this->ends_at->copy()->addDays(7); // 7-day grace period
        $this->status = 'active';
        $this->save();

        return $this;
    }

    /**
     * Scope to get only active subscriptions.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                     ->where('ends_at', '>', now());
    }

    /**
     * Scope to get only expired subscriptions.
     */
    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }

    /**
     * Scope to get subscriptions in grace period.
     */
    public function scopeInGracePeriod($query)
    {
        return $query->where('status', 'grace_period')
                     ->where('ends_at', '<=', now())
                     ->where('grace_ends_at', '>', now());
    }
}
