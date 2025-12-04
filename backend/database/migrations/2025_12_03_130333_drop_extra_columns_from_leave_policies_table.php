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
            $columnsToDrop = [];

            if (Schema::hasColumn('leave_policies', 'eligibility_employee_ids')) {
                $columnsToDrop[] = 'eligibility_employee_ids';
            }
            if (Schema::hasColumn('leave_policies', 'archived')) {
                $columnsToDrop[] = 'archived';
            }
            if (Schema::hasColumn('leave_policies', 'created_by')) {
                $columnsToDrop[] = 'created_by';
            }
            if (Schema::hasColumn('leave_policies', 'updated_by')) {
                $columnsToDrop[] = 'updated_by';
            }
            if (Schema::hasColumn('leave_policies', 'monthly_accrual_enabled')) {
                $columnsToDrop[] = 'monthly_accrual_enabled';
            }
            if (Schema::hasColumn('leave_policies', 'sandwich_examples')) {
                $columnsToDrop[] = 'sandwich_examples';
            }
            if (Schema::hasColumn('leave_policies', 'last_updated_at')) {
                $columnsToDrop[] = 'last_updated_at';
            }
            if (Schema::hasColumn('leave_policies', 'sandwich_rule_description')) {
                $columnsToDrop[] = 'sandwich_rule_description';
            }
            if (Schema::hasColumn('leave_policies', 'metadata')) {
                $columnsToDrop[] = 'metadata';
            }
            if (Schema::hasColumn('leave_policies', 'eligibility_rules')) {
                $columnsToDrop[] = 'eligibility_rules';
            }

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_policies', function (Blueprint $table) {
            $table->json('eligibility_employee_ids')->nullable();
            $table->boolean('archived')->default(false);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->boolean('monthly_accrual_enabled')->default(true);
            $table->json('sandwich_examples')->nullable();
            $table->timestamp('last_updated_at')->nullable();
        });
    }
};
