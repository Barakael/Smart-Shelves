<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'room_id',
        'panel_id',
        'shelf_id',
        'action_type',
        'payload',
        'description',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function panel()
    {
        return $this->belongsTo(Panel::class);
    }

    public function shelf()
    {
        return $this->belongsTo(Shelf::class);
    }
}






