<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    use HasFactory;

    protected $table = 'subscription_plans';

    protected $fillable = [
        'name',
        'price',
        'period_days',
        'features',
        'description',
        'is_active',
    ];

    protected $casts = [
        'features' => 'json',
        'is_active' => 'boolean',
        'price' => 'decimal:2',
    ];

    /**
     * Get all subscriptions with this plan.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'plan_id');
    }
}
