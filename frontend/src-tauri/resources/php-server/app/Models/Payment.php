<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'subscription_id',
        'room_id',
        'amount',
        'currency',
        'payment_method',
        'status',
        'reference_number',
        'notes',
        'paid_at',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    /**
     * Get the subscription this payment is for.
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /**
     * Get the room this payment is for.
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Get the user who confirmed this payment.
     */
    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    /**
     * Mark the payment as confirmed.
     */
    public function markConfirmed(int $userId): self
    {
        $this->status = 'confirmed';
        $this->confirmed_by = $userId;
        $this->confirmed_at = now();
        $this->save();

        return $this;
    }

    /**
     * Mark the payment as rejected.
     */
    public function markRejected(): self
    {
        $this->status = 'rejected';
        $this->save();

        return $this;
    }

    /**
     * Scope to get pending payments.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get confirmed payments.
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }
}
