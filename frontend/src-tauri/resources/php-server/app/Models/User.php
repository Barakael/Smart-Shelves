<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

    public function isManager(): bool
    {
        return $this->role === 'manager';
    }

    public function canManageOperators(): bool
    {
        return $this->isAdmin() || $this->isManager();
    }

    public function notificationItems(): HasMany
    {
        return $this->hasMany(NotificationItem::class);
    }

    public function accessibleRoomIds(): array
    {
        if ($this->isAdmin()) {
            return Room::query()->pluck('id')->all();
        }

        if ($this->isManager()) {
            $ids = $this->rooms()->pluck('rooms.id')->all();
            if (!empty($ids)) {
                return $ids;
            }
        }

        return $this->room_id ? [$this->room_id] : [];
    }

    public function canAccessRoom(?int $roomId): bool
    {
        if ($roomId === null) {
            return false;
        }

        return in_array($roomId, $this->accessibleRoomIds(), true);
    }
}

