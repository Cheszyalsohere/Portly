<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Snapshot extends Model
{
    /** @use HasFactory<\Database\Factories\SnapshotFactory> */
    use HasFactory;

    protected $fillable = ['portfolio_id', 'document', 'revision', 'label'];

    protected function casts(): array
    {
        return [
            'document' => 'array',
            'revision' => 'integer',
        ];
    }

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class);
    }
}
