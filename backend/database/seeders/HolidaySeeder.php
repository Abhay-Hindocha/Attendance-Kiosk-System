<?php

namespace Database\Seeders;

use App\Models\Holiday;
use Illuminate\Database\Seeder;

class HolidaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $holidays = [
            // 2024 Holidays
            ['date' => '2024-01-26', 'name' => 'Republic Day', 'description' => 'National Holiday'],
            ['date' => '2024-03-08', 'name' => 'Maha Shivaratri', 'description' => 'Hindu Festival'],
            ['date' => '2024-03-25', 'name' => 'Holi', 'description' => 'Hindu Festival'],
            ['date' => '2024-03-29', 'name' => 'Good Friday', 'description' => 'Christian Holiday'],
            ['date' => '2024-04-11', 'name' => 'Eid ul-Fitr', 'description' => 'Islamic Festival'],
            ['date' => '2024-04-17', 'name' => 'Ram Navami', 'description' => 'Hindu Festival'],
            ['date' => '2024-04-21', 'name' => 'Mahavir Jayanti', 'description' => 'Jain Festival'],
            ['date' => '2024-05-23', 'name' => 'Buddha Purnima', 'description' => 'Buddhist Festival'],
            ['date' => '2024-06-17', 'name' => 'Eid ul-Adha', 'description' => 'Islamic Festival'],
            ['date' => '2024-07-17', 'name' => 'Muharram', 'description' => 'Islamic Festival'],
            ['date' => '2024-08-15', 'name' => 'Independence Day', 'description' => 'National Holiday'],
            ['date' => '2024-08-26', 'name' => 'Janmashtami', 'description' => 'Hindu Festival'],
            ['date' => '2024-09-16', 'name' => 'Milad ul-Nabi', 'description' => 'Islamic Festival'],
            ['date' => '2024-09-18', 'name' => 'Ganesh Chaturthi', 'description' => 'Hindu Festival'],
            ['date' => '2024-10-02', 'name' => 'Gandhi Jayanti', 'description' => 'National Holiday'],
            ['date' => '2024-10-12', 'name' => 'Dussehra', 'description' => 'Hindu Festival'],
            ['date' => '2024-10-31', 'name' => 'Diwali', 'description' => 'Hindu Festival'],
            ['date' => '2024-11-01', 'name' => 'Diwali (Day 2)', 'description' => 'Hindu Festival'],
            ['date' => '2024-11-15', 'name' => 'Guru Nanak Jayanti', 'description' => 'Sikh Festival'],
            ['date' => '2024-12-25', 'name' => 'Christmas Day', 'description' => 'Christian Holiday'],

            // 2025 Holidays
            ['date' => '2025-01-26', 'name' => 'Republic Day', 'description' => 'National Holiday'],
            ['date' => '2025-03-14', 'name' => 'Holi', 'description' => 'Hindu Festival'],
            ['date' => '2025-04-02', 'name' => 'Eid ul-Fitr', 'description' => 'Islamic Festival'],
            ['date' => '2025-04-10', 'name' => 'Good Friday', 'description' => 'Christian Holiday'],
            ['date' => '2025-04-18', 'name' => 'Ram Navami', 'description' => 'Hindu Festival'],
            ['date' => '2025-04-21', 'name' => 'Mahavir Jayanti', 'description' => 'Jain Festival'],
            ['date' => '2025-05-23', 'name' => 'Buddha Purnima', 'description' => 'Buddhist Festival'],
            ['date' => '2025-06-06', 'name' => 'Eid ul-Adha', 'description' => 'Islamic Festival'],
            ['date' => '2025-07-07', 'name' => 'Muharram', 'description' => 'Islamic Festival'],
            ['date' => '2025-08-15', 'name' => 'Independence Day', 'description' => 'National Holiday'],
            ['date' => '2025-08-16', 'name' => 'Janmashtami', 'description' => 'Hindu Festival'],
            ['date' => '2025-09-05', 'name' => 'Milad ul-Nabi', 'description' => 'Islamic Festival'],
            ['date' => '2025-09-07', 'name' => 'Ganesh Chaturthi', 'description' => 'Hindu Festival'],
            ['date' => '2025-10-02', 'name' => 'Gandhi Jayanti', 'description' => 'National Holiday'],
            ['date' => '2025-10-01', 'name' => 'Dussehra', 'description' => 'Hindu Festival'],
            ['date' => '2025-10-20', 'name' => 'Diwali', 'description' => 'Hindu Festival'],
            ['date' => '2025-10-21', 'name' => 'Diwali (Day 2)', 'description' => 'Hindu Festival'],
            ['date' => '2025-11-05', 'name' => 'Guru Nanak Jayanti', 'description' => 'Sikh Festival'],
            ['date' => '2025-12-25', 'name' => 'Christmas Day', 'description' => 'Christian Holiday'],

            // 2026 Holidays
            ['date' => '2026-01-26', 'name' => 'Republic Day', 'description' => 'National Holiday'],
            ['date' => '2026-03-03', 'name' => 'Holi', 'description' => 'Hindu Festival'],
            ['date' => '2026-03-30', 'name' => 'Good Friday', 'description' => 'Christian Holiday'],
            ['date' => '2026-03-31', 'name' => 'Eid ul-Fitr', 'description' => 'Islamic Festival'],
            ['date' => '2026-04-07', 'name' => 'Ram Navami', 'description' => 'Hindu Festival'],
            ['date' => '2026-04-21', 'name' => 'Mahavir Jayanti', 'description' => 'Jain Festival'],
            ['date' => '2026-05-13', 'name' => 'Buddha Purnima', 'description' => 'Buddhist Festival'],
            ['date' => '2026-05-26', 'name' => 'Eid ul-Adha', 'description' => 'Islamic Festival'],
            ['date' => '2026-06-27', 'name' => 'Muharram', 'description' => 'Islamic Festival'],
            ['date' => '2026-08-15', 'name' => 'Independence Day', 'description' => 'National Holiday'],
            ['date' => '2026-09-05', 'name' => 'Janmashtami', 'description' => 'Hindu Festival'],
            ['date' => '2026-09-25', 'name' => 'Milad ul-Nabi', 'description' => 'Islamic Festival'],
            ['date' => '2026-08-27', 'name' => 'Ganesh Chaturthi', 'description' => 'Hindu Festival'],
            ['date' => '2026-10-02', 'name' => 'Gandhi Jayanti', 'description' => 'National Holiday'],
            ['date' => '2026-09-20', 'name' => 'Dussehra', 'description' => 'Hindu Festival'],
            ['date' => '2026-10-09', 'name' => 'Diwali', 'description' => 'Hindu Festival'],
            ['date' => '2026-10-10', 'name' => 'Diwali (Day 2)', 'description' => 'Hindu Festival'],
            ['date' => '2026-11-25', 'name' => 'Guru Nanak Jayanti', 'description' => 'Sikh Festival'],
            ['date' => '2026-12-25', 'name' => 'Christmas Day', 'description' => 'Christian Holiday'],

            // 2027 Holidays
            ['date' => '2027-01-26', 'name' => 'Republic Day', 'description' => 'National Holiday'],
            ['date' => '2027-03-22', 'name' => 'Holi', 'description' => 'Hindu Festival'],
            ['date' => '2027-04-09', 'name' => 'Good Friday', 'description' => 'Christian Holiday'],
            ['date' => '2027-04-20', 'name' => 'Eid ul-Fitr', 'description' => 'Islamic Festival'],
            ['date' => '2027-03-27', 'name' => 'Ram Navami', 'description' => 'Hindu Festival'],
            ['date' => '2027-04-21', 'name' => 'Mahavir Jayanti', 'description' => 'Jain Festival'],
            ['date' => '2027-05-03', 'name' => 'Buddha Purnima', 'description' => 'Buddhist Festival'],
            ['date' => '2027-05-16', 'name' => 'Eid ul-Adha', 'description' => 'Islamic Festival'],
            ['date' => '2027-06-16', 'name' => 'Muharram', 'description' => 'Islamic Festival'],
            ['date' => '2027-08-15', 'name' => 'Independence Day', 'description' => 'National Holiday'],
            ['date' => '2027-08-25', 'name' => 'Janmashtami', 'description' => 'Hindu Festival'],
            ['date' => '2027-09-14', 'name' => 'Milad ul-Nabi', 'description' => 'Islamic Festival'],
            ['date' => '2027-09-16', 'name' => 'Ganesh Chaturthi', 'description' => 'Hindu Festival'],
            ['date' => '2027-10-02', 'name' => 'Gandhi Jayanti', 'description' => 'National Holiday'],
            ['date' => '2027-10-10', 'name' => 'Dussehra', 'description' => 'Hindu Festival'],
            ['date' => '2027-10-29', 'name' => 'Diwali', 'description' => 'Hindu Festival'],
            ['date' => '2027-10-30', 'name' => 'Diwali (Day 2)', 'description' => 'Hindu Festival'],
            ['date' => '2027-11-15', 'name' => 'Guru Nanak Jayanti', 'description' => 'Sikh Festival'],
            ['date' => '2027-12-25', 'name' => 'Christmas Day', 'description' => 'Christian Holiday'],

            // 2028 Holidays
            ['date' => '2028-01-26', 'name' => 'Republic Day', 'description' => 'National Holiday'],
            ['date' => '2028-03-12', 'name' => 'Holi', 'description' => 'Hindu Festival'],
            ['date' => '2028-03-31', 'name' => 'Good Friday', 'description' => 'Christian Holiday'],
            ['date' => '2028-04-10', 'name' => 'Eid ul-Fitr', 'description' => 'Islamic Festival'],
            ['date' => '2028-04-15', 'name' => 'Ram Navami', 'description' => 'Hindu Festival'],
            ['date' => '2028-04-21', 'name' => 'Mahavir Jayanti', 'description' => 'Jain Festival'],
            ['date' => '2028-05-22', 'name' => 'Buddha Purnima', 'description' => 'Buddhist Festival'],
            ['date' => '2028-04-05', 'name' => 'Eid ul-Adha', 'description' => 'Islamic Festival'],
            ['date' => '2028-06-05', 'name' => 'Muharram', 'description' => 'Islamic Festival'],
            ['date' => '2028-08-15', 'name' => 'Independence Day', 'description' => 'National Holiday'],
            ['date' => '2028-09-14', 'name' => 'Janmashtami', 'description' => 'Hindu Festival'],
            ['date' => '2028-09-03', 'name' => 'Milad ul-Nabi', 'description' => 'Islamic Festival'],
            ['date' => '2028-09-05', 'name' => 'Ganesh Chaturthi', 'description' => 'Hindu Festival'],
            ['date' => '2028-10-02', 'name' => 'Gandhi Jayanti', 'description' => 'National Holiday'],
            ['date' => '2028-09-29', 'name' => 'Dussehra', 'description' => 'Hindu Festival'],
            ['date' => '2028-10-18', 'name' => 'Diwali', 'description' => 'Hindu Festival'],
            ['date' => '2028-10-19', 'name' => 'Diwali (Day 2)', 'description' => 'Hindu Festival'],
            ['date' => '2028-11-04', 'name' => 'Guru Nanak Jayanti', 'description' => 'Sikh Festival'],
            ['date' => '2028-12-25', 'name' => 'Christmas Day', 'description' => 'Christian Holiday'],

            // 2029 Holidays
            ['date' => '2029-01-26', 'name' => 'Republic Day', 'description' => 'National Holiday'],
            ['date' => '2029-03-01', 'name' => 'Holi', 'description' => 'Hindu Festival'],
            ['date' => '2029-04-20', 'name' => 'Good Friday', 'description' => 'Christian Holiday'],
            ['date' => '2029-03-30', 'name' => 'Eid ul-Fitr', 'description' => 'Islamic Festival'],
            ['date' => '2029-04-04', 'name' => 'Ram Navami', 'description' => 'Hindu Festival'],
            ['date' => '2029-04-21', 'name' => 'Mahavir Jayanti', 'description' => 'Jain Festival'],
            ['date' => '2029-05-11', 'name' => 'Buddha Purnima', 'description' => 'Buddhist Festival'],
            ['date' => '2029-03-25', 'name' => 'Eid ul-Adha', 'description' => 'Islamic Festival'],
            ['date' => '2029-05-25', 'name' => 'Muharram', 'description' => 'Islamic Festival'],
            ['date' => '2029-08-15', 'name' => 'Independence Day', 'description' => 'National Holiday'],
            ['date' => '2029-09-02', 'name' => 'Janmashtami', 'description' => 'Hindu Festival'],
            ['date' => '2029-08-23', 'name' => 'Milad ul-Nabi', 'description' => 'Islamic Festival'],
            ['date' => '2029-08-25', 'name' => 'Ganesh Chaturthi', 'description' => 'Hindu Festival'],
            ['date' => '2029-10-02', 'name' => 'Gandhi Jayanti', 'description' => 'National Holiday'],
            ['date' => '2029-09-19', 'name' => 'Dussehra', 'description' => 'Hindu Festival'],
            ['date' => '2029-10-08', 'name' => 'Diwali', 'description' => 'Hindu Festival'],
            ['date' => '2029-10-09', 'name' => 'Diwali (Day 2)', 'description' => 'Hindu Festival'],
            ['date' => '2029-11-24', 'name' => 'Guru Nanak Jayanti', 'description' => 'Sikh Festival'],
            ['date' => '2029-12-25', 'name' => 'Christmas Day', 'description' => 'Christian Holiday'],

            // 2030 Holidays
            ['date' => '2030-01-26', 'name' => 'Republic Day', 'description' => 'National Holiday'],
            ['date' => '2030-03-21', 'name' => 'Holi', 'description' => 'Hindu Festival'],
            ['date' => '2030-04-12', 'name' => 'Good Friday', 'description' => 'Christian Holiday'],
            ['date' => '2030-04-19', 'name' => 'Eid ul-Fitr', 'description' => 'Islamic Festival'],
            ['date' => '2030-03-24', 'name' => 'Ram Navami', 'description' => 'Hindu Festival'],
            ['date' => '2030-04-21', 'name' => 'Mahavir Jayanti', 'description' => 'Jain Festival'],
            ['date' => '2030-05-01', 'name' => 'Buddha Purnima', 'description' => 'Buddhist Festival'],
            ['date' => '2030-04-14', 'name' => 'Eid ul-Adha', 'description' => 'Islamic Festival'],
            ['date' => '2030-05-14', 'name' => 'Muharram', 'description' => 'Islamic Festival'],
            ['date' => '2030-08-15', 'name' => 'Independence Day', 'description' => 'National Holiday'],
            ['date' => '2030-08-23', 'name' => 'Janmashtami', 'description' => 'Hindu Festival'],
            ['date' => '2030-08-12', 'name' => 'Milad ul-Nabi', 'description' => 'Islamic Festival'],
            ['date' => '2030-09-14', 'name' => 'Ganesh Chaturthi', 'description' => 'Hindu Festival'],
            ['date' => '2030-10-02', 'name' => 'Gandhi Jayanti', 'description' => 'National Holiday'],
            ['date' => '2030-10-08', 'name' => 'Dussehra', 'description' => 'Hindu Festival'],
            ['date' => '2030-10-27', 'name' => 'Diwali', 'description' => 'Hindu Festival'],
            ['date' => '2030-10-28', 'name' => 'Diwali (Day 2)', 'description' => 'Hindu Festival'],
            ['date' => '2030-11-13', 'name' => 'Guru Nanak Jayanti', 'description' => 'Sikh Festival'],
            ['date' => '2030-12-25', 'name' => 'Christmas Day', 'description' => 'Christian Holiday'],
        ];

        // Clear existing holidays and insert new ones
        Holiday::truncate();
        
        foreach ($holidays as $holiday) {
            Holiday::create($holiday);
        }
    }
}

