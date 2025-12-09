<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE attendance_correction_requests MODIFY COLUMN type ENUM('missing', 'wrong_checkin', 'wrong_checkout', 'wrong_break')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE attendance_correction_requests MODIFY COLUMN type ENUM('missing', 'wrong_checkin', 'wrong_checkout')");
    }
};
