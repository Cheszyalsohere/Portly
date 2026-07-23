<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Media extends Model
{
    /** @use HasFactory<\Database\Factories\MediaFactory> */
    use HasFactory;

    protected $table = 'media';

    protected $fillable = ['user_id', 'path', 'mime', 'size', 'width', 'height'];

    protected function casts(): array
    {
        return [
            'size'   => 'integer',
            'width'  => 'integer',
            'height' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
