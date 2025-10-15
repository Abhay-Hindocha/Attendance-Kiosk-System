<?php

namespace Database\Factories;

use App\Models\Policy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Policy>
 */
class PolicyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->word(),
            'effective_from' => fake()->optional()->date(),
            'effective_to' => fake()->optional()->date(),
            'include_break' => fake()->boolean(),
            'break_hours' => fake()->numberBetween(0, 2),
            'break_minutes' => fake()->numberBetween(0, 59),
            'full_day_hours' => fake()->numberBetween(8, 10),
            'full_day_minutes' => fake()->numberBetween(0, 59),
            'half_day_hours' => fake()->numberBetween(4, 5),
            'half_day_minutes' => fake()->numberBetween(0, 59),
            'enable_late_tracking' => fake()->boolean(),
            'work_start_time' => fake()->time('H:i'),
            'late_grace_period' => fake()->numberBetween(0, 30),
            'enable_early_tracking' => fake()->boolean(),
            'work_end_time' => fake()->time('H:i'),
            'early_grace_period' => fake()->numberBetween(0, 30),
        ];
    }
}
