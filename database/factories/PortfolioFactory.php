<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Portfolio>
 */
class PortfolioFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'  => User::factory(),
            'title'    => fake()->words(2, true),
            'slug'     => null,
            'revision' => 0,
            'document' => [
                'version'  => 1,
                'theme'    => 'minimal',
                'template' => 'blank',
                'meta'     => ['title' => '', 'description' => ''],
                'sections' => [],
            ],
        ];
    }
}
