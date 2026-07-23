<?php

use App\Models\Media;
use App\Models\User;

it('belongs to a user', function () {
    $user  = User::factory()->create();
    $media = Media::factory()->for($user)->create();

    expect($media->user->id)->toBe($user->id);
});

it('stores dimensions as integers', function () {
    $media = Media::factory()->create([
        'width'  => 1200,
        'height' => 800,
        'size'   => 45_312,
    ]);

    expect($media->fresh()->width)->toBe(1200)
        ->and($media->fresh()->height)->toBe(800)
        ->and($media->fresh()->size)->toBe(45_312);
});

it('allows null dimensions for files that are not images', function () {
    $media = Media::factory()->create([
        'mime'   => 'application/pdf',
        'width'  => null,
        'height' => null,
    ]);

    expect($media->fresh()->width)->toBeNull()
        ->and($media->fresh()->height)->toBeNull();
});

it('is deleted when its owner is deleted', function () {
    $user  = User::factory()->create();
    $media = Media::factory()->for($user)->create();

    $user->delete();

    expect(Media::find($media->id))->toBeNull();
});
