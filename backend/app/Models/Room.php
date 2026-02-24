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
        'subscription_status_checked_at',
    ];

    protected $casts = [
        'subscription_status_checked_at' => 'datetime',
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

    public function subscription()
    {
        return $this->hasOne(Subscription::class);
    }
}

