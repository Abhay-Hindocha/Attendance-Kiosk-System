<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Admin;
use App\Models\Policy;
use App\Models\Employee;
use App\Models\Attendance;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create a default admin user if it doesn't exist
        Admin::firstOrCreate(
            ['email' => 'admin@kiosk.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        // Create a test user if it doesn't exist
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
            ]
        );

        // Seed policies
        Policy::factory()->count(5)->create();

        // Seed employees (each linked to a random policy)
        Employee::factory()->count(20)->create();

        // Seed attendances (each linked to a random employee)
        Attendance::factory()->count(100)->create();
    }
}
