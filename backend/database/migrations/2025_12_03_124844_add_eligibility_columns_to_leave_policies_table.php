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
        Schema::table('leave_policies', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_policies', 'eligibility_departments')) {
                $table->json('eligibility_departments')->nullable();
            }
            if (!Schema::hasColumn('leave_policies', 'eligibility_designations')) {
                $table->json('eligibility_designations')->nullable();
            }
            if (!Schema::hasColumn('leave_policies', 'eligibility_employee_ids')) {
                $table->json('eligibility_employee_ids')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_policies', function (Blueprint $table) {
            $table->dropColumn(['eligibility_departments', 'eligibility_designations', 'eligibility_employee_ids']);
        });
    }
};
