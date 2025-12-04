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
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropForeign(['leave_policy_id']);
            $table->dropUnique('employee_policy_balance_unique');
            $table->unique(['employee_id', 'leave_policy_id', 'year'], 'employee_policy_year_balance_unique');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_policy_id')->references('id')->on('leave_policies')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropForeign(['leave_policy_id']);
            $table->dropUnique('employee_policy_year_balance_unique');
            $table->unique(['employee_id', 'leave_policy_id'], 'employee_policy_balance_unique');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_policy_id')->references('id')->on('leave_policies')->onDelete('cascade');
        });
    }
};
