<?php

namespace Database\Seeders;

use App\Models\Policy;
use Illuminate\Database\Seeder;

class PolicySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Standard Office Policy
        Policy::create([
            'name' => 'Standard Office',
            'status' => 'active',
            'effective_from' => now(),
            'effective_to' => null,
            'include_break' => true,
            'break_hours' => 1,
            'break_minutes' => 0,
            'full_day_hours' => 8,
            'full_day_minutes' => 0,
            'half_day_hours' => 4,
            'half_day_minutes' => 0,
            'enable_late_tracking' => true,
            'work_start_time' => '09:00',
            'late_grace_period' => 15,
            'enable_early_tracking' => true,
            'work_end_time' => '18:00',
            'early_grace_period' => 15,
        ]);

        // Flexible Hours Policy
        Policy::create([
            'name' => 'Flexible Hours',
            'status' => 'active',
            'effective_from' => now(),
            'effective_to' => null,
            'include_break' => true,
            'break_hours' => 1,
            'break_minutes' => 0,
            'full_day_hours' => 8,
            'full_day_minutes' => 0,
            'half_day_hours' => 4,
            'half_day_minutes' => 0,
            'enable_late_tracking' => true,
            'work_start_time' => '10:00',
            'late_grace_period' => 15,
            'enable_early_tracking' => true,
            'work_end_time' => '19:00',
            'early_grace_period' => 15,
        ]);

        // Night Shift Policy
        Policy::create([
            'name' => 'Night Shift',
            'status' => 'active',
            'effective_from' => now(),
            'effective_to' => null,
            'include_break' => true,
            'break_hours' => 1,
            'break_minutes' => 0,
            'full_day_hours' => 8,
            'full_day_minutes' => 0,
            'half_day_hours' => 4,
            'half_day_minutes' => 0,
            'enable_late_tracking' => true,
            'work_start_time' => '22:00',
            'late_grace_period' => 15,
            'enable_early_tracking' => true,
            'work_end_time' => '06:00',
            'early_grace_period' => 15,
        ]);
    }
}
