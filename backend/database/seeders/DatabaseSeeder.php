<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Policy;
use App\Models\Employee;
use App\Models\Attendance;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create a test user
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Seed policies
        Policy::factory()->count(5)->create();

        // Seed employees (each linked to a random policy)
        Employee::factory()->count(20)->create();

        // Seed attendances (each linked to a random employee)
        Attendance::factory()->count(100)->create();
    }
}
