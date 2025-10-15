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
        // Add indexes to attendances table
        Schema::table('attendances', function (Blueprint $table) {
            $table->index('employee_id');
            $table->index('date');
            $table->index('status');
        });

        // Add indexes to employees table
        Schema::table('employees', function (Blueprint $table) {
            $table->index('policy_id');
            $table->index('name');
        });

        // Add indexes to policies table
        Schema::table('policies', function (Blueprint $table) {
            $table->index('effective_from');
            $table->index('effective_to');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop indexes from attendances table
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex(['employee_id']);
            $table->dropIndex(['date']);
            $table->dropIndex(['status']);
        });

        // Drop indexes from employees table
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex(['policy_id']);
            $table->dropIndex(['name']);
        });

        // Drop indexes from policies table
        Schema::table('policies', function (Blueprint $table) {
            $table->dropIndex(['effective_from']);
            $table->dropIndex(['effective_to']);
        });
    }
};
