<?php

use App\Models\Portfolio;
use App\Models\User;

it('lets the owner view their portfolio', function () {
    $user      = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create();

    expect($user->can('view', $portfolio))->toBeTrue();
});

it('lets the owner update their portfolio', function () {
    $user      = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create();

    expect($user->can('update', $portfolio))->toBeTrue();
});

it('lets the owner delete their portfolio', function () {
    $user      = User::factory()->create();
    $portfolio = Portfolio::factory()->for($user)->create();

    expect($user->can('delete', $portfolio))->toBeTrue();
});

it('stops a different user from viewing a portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $stranger  = User::factory()->create();

    expect($stranger->can('view', $portfolio))->toBeFalse();
});

it('stops a different user from updating a portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $stranger  = User::factory()->create();

    expect($stranger->can('update', $portfolio))->toBeFalse();
});

it('stops a different user from deleting a portfolio', function () {
    $portfolio = Portfolio::factory()->create();
    $stranger  = User::factory()->create();

    expect($stranger->can('delete', $portfolio))->toBeFalse();
});
