<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shelf extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'ip_address',
        'rows',
        'columns',
        'controller',
        'room_id',
        'panel_id',
        'cabinet_id',
        'row_index',
        'column_index',
        'is_controller',
        'shelf_number',
        'is_first',
        'open_direction',
        'is_open',
        'open_command',
        'close_command',
    ];

    protected $casts = [
        'is_controller' => 'boolean',
        'is_first' => 'boolean',
        'is_open' => 'boolean',
        'rows' => 'integer',
        'columns' => 'integer',
        'row_index' => 'integer',
        'column_index' => 'integer',
        'shelf_number' => 'integer',
        'open_command' => 'string',
        'close_command' => 'string',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function panel()
    {
        return $this->belongsTo(Panel::class);
    }

    public function cabinet()
    {
        return $this->belongsTo(Cabinet::class);
    }
}

