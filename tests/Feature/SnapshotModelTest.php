<?php

use App\Models\Portfolio;
use App\Models\Snapshot;

it('belongs to a portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $snapshot  = Snapshot::factory()->for($portfolio)->create();

    expect($snapshot->portfolio->id)->toBe($portfolio->id);
});

it('exposes snapshots from the portfolio side', function () {
    $portfolio = Portfolio::factory()->create();
    Snapshot::factory()->count(3)->for($portfolio)->create();

    expect($portfolio->snapshots)->toHaveCount(3);
});

it('casts document to an array', function () {
    $document = ['version' => 1, 'theme' => 'brutalist', 'sections' => []];

    $snapshot = Snapshot::factory()->create(['document' => $document]);

    expect($snapshot->fresh()->document)->toBe($document);
});

it('allows a null label', function () {
    expect(Snapshot::factory()->create(['label' => null])->label)->toBeNull();
});

it('is deleted when its portfolio is deleted', function () {
    $portfolio = Portfolio::factory()->create();
    $snapshot  = Snapshot::factory()->for($portfolio)->create();

    $portfolio->delete();

    expect(Snapshot::find($snapshot->id))->toBeNull();
});
