<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'name',
        'status',
        'shelf_label',
        'docket',
        'side',
        'row_index',
        'column_index',
        'cabinet_id',
        'room_id',
        'shelf_id',
        'metadata',
    ];

    protected $casts = [
        'docket' => 'integer',
        'row_index' => 'integer',
        'column_index' => 'integer',
        'metadata' => 'array',
    ];

    public function cabinet(): BelongsTo
    {
        return $this->belongsTo(Cabinet::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function shelf(): BelongsTo
    {
        return $this->belongsTo(Shelf::class);
    }
}
