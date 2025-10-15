<?php

namespace Database\Factories;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Attendance>
 */
class AttendanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory(),
            'check_in' => fake()->optional()->dateTime(),
            'check_out' => fake()->optional()->dateTime(),
            'date' => fake()->date(),
            'status' => fake()->randomElement(['present', 'absent', 'late', 'half_day']),
        ];
    }
}
