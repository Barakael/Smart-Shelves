<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cabinet extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'ip_address',
        'port',
        'function_byte',
        'checksum_offset',
        'shelf_count',
        'total_rows',
        'total_columns',
        'controller_row',
        'controller_column',
        'macro_close_command',
        'macro_lock_command',
        'macro_vent_command',
        'room_id',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'port' => 'integer',
        'checksum_offset' => 'integer',
        'shelf_count' => 'integer',
        'total_rows' => 'integer',
        'total_columns' => 'integer',
        'controller_row' => 'integer',
        'controller_column' => 'integer',
    ];

    /**
     * Get the room that the cabinet belongs to.
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Get the shelves that belong to this cabinet.
     */
    public function shelves(): HasMany
    {
        return $this->hasMany(Shelf::class);
    }

    /**
     * Get the action logs for this cabinet.
     */
    public function actionLogs(): HasMany
    {
        return $this->hasMany(ActionLog::class, 'cabinet_id');
    }
}
