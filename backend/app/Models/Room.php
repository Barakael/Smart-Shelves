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
}

