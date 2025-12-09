<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendance_correction_requests', function (Blueprint $table) {
            // Drop the existing foreign key constraint
            $table->dropForeign(['admin_id']);

            // Change the foreign key to reference admins table
            $table->foreign('admin_id')->references('id')->on('admins')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_correction_requests', function (Blueprint $table) {
            // Drop the foreign key to admins
            $table->dropForeign(['admin_id']);

            // Restore the foreign key to employees
            $table->foreign('admin_id')->references('id')->on('employees')->onDelete('set null');
        });
    }
};
