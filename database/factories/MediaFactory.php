<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Media>
 */
class MediaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'path'    => 'media/'.fake()->uuid().'.jpg',
            'mime'    => 'image/jpeg',
            'size'    => fake()->numberBetween(10_000, 500_000),
            'width'   => 1200,
            'height'  => 800,
        ];
    }
}
