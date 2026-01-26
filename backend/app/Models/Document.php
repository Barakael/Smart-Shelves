<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

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
        'file_path',
        'file_disk',
        'file_original_name',
        'file_mime_type',
        'file_size',
    ];

    protected $casts = [
        'docket' => 'integer',
        'row_index' => 'integer',
        'column_index' => 'integer',
        'metadata' => 'array',
        'file_size' => 'integer',
    ];

    protected $appends = [
        'has_file',
        'file_url',
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

    public function statusHistories(): HasMany
    {
        return $this->hasMany(DocumentStatusHistory::class)->orderByDesc('created_at');
    }

    public function getHasFileAttribute(): bool
    {
        return !empty($this->file_path);
    }

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        $disk = $this->file_disk ?: config('filesystems.default', 'local');

        try {
            return Storage::disk($disk)->url($this->file_path);
        } catch (\Throwable $exception) {
            return null;
        }
    }
}
