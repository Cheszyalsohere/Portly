<?php

use App\Models\Portfolio;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('shows no portfolios for a new user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('dashboard')
            ->has('portfolios', 0)
        );
});

it('lists the portfolios belonging to the user', function () {
    $user = User::factory()->create();
    Portfolio::factory()->count(2)->for($user)->create();

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('portfolios', 2)
            ->has('portfolios.0', fn (AssertableInertia $item) => $item
                ->hasAll(['id', 'title', 'slug', 'updated_at'])
            )
        );
});

it('never lists portfolios belonging to someone else', function () {
    $user = User::factory()->create();
    Portfolio::factory()->count(3)->create();

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('portfolios', 0));
});
