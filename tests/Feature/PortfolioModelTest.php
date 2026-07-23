<?php

use App\Models\Portfolio;
use App\Models\User;

it('casts document to an array', function () {
    $portfolio = Portfolio::factory()->create([
        'document' => ['version' => 1, 'theme' => 'minimal', 'sections' => []],
    ]);

    expect($portfolio->fresh()->document)
        ->toBe(['version' => 1, 'theme' => 'minimal', 'sections' => []]);
});

it('starts at revision zero', function () {
    expect(Portfolio::factory()->create()->revision)->toBe(0);
});

it('is unpublished by default', function () {
    $portfolio = Portfolio::factory()->create();

    expect($portfolio->published_at)->toBeNull()
        ->and($portfolio->published_document)->toBeNull()
        ->and($portfolio->published_revision)->toBeNull();
});

it('casts published_document to an array once published', function () {
    $document = ['version' => 1, 'theme' => 'dark', 'sections' => []];

    $portfolio = Portfolio::factory()->create([
        'published_document'  => $document,
        'published_revision'  => 3,
        'published_at'        => now(),
    ]);

    expect($portfolio->fresh()->published_document)->toBe($document)
        ->and($portfolio->fresh()->published_revision)->toBe(3);
});

it('belongs to a user', function () {
    $user      = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create();

    expect($portfolio->user->id)->toBe($user->id);
});

it('allows a null slug so unpublished drafts do not need one', function () {
    expect(Portfolio::factory()->create(['slug' => null])->slug)->toBeNull();
});
