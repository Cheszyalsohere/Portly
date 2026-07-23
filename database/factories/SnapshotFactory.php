<?php

namespace Database\Factories;

use App\Models\Portfolio;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Snapshot>
 */
class SnapshotFactory extends Factory
{
    public function definition(): array
    {
        return [
            'portfolio_id' => Portfolio::factory(),
            'document'     => [
                'version'  => 1,
                'theme'    => 'minimal',
                'template' => 'blank',
                'meta'     => ['title' => '', 'description' => ''],
                'sections' => [],
            ],
            'revision' => fake()->numberBetween(1, 50),
            'label'    => null,
        ];
    }
}
