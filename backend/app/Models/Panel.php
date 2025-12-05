<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Panel extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'ip_address',
        'rows',
        'columns',
        'room_id',
    ];

    protected $casts = [
        'rows' => 'integer',
        'columns' => 'integer',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function shelves()
    {
        return $this->hasMany(Shelf::class);
    }

    public function getControllerShelfForRow(int $rowIndex)
    {
        return $this->shelves()
            ->where('row_index', $rowIndex)
            ->where('is_controller', true)
            ->first();
    }
}






