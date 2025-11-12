<?php

namespace Database\Seeders;

use App\Models\Holiday;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;

class HolidaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Fetch Indian public holidays from 2020 to 2050 using Nager.Date API
        for ($year = 2020; $year <= 2050; $year++) {
            $response = Http::withoutVerifying()->get("https://date.nager.at/api/v3/PublicHolidays/{$year}/IN");

            if ($response->successful()) {
                $holidays = $response->json();

                if (is_array($holidays)) {
                    foreach ($holidays as $holiday) {
                        Holiday::firstOrCreate(
                            ['date' => $holiday['date'], 'name' => $holiday['name']],
                            [
                                'description' => $holiday['localName'] ?? null,
                            ]
                        );
                    }
                }
            }
        }
    }
}
