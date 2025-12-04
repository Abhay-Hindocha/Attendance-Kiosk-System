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

            if (Schema::hasColumn('leave_policies', 'join_date_proration')) {
                $columnsToDrop[] = 'join_date_proration';
            }
            if (Schema::hasColumn('leave_policies', 'status')) {
                $columnsToDrop[] = 'status';
            }
            if (Schema::hasColumn('leave_policies', 'monthly_accrual')) {
                $columnsToDrop[] = 'monthly_accrual';
            }
            if (Schema::hasColumn('leave_policies', 'accrual_day_of_month')) {
                $columnsToDrop[] = 'accrual_day_of_month';
            }
            if (Schema::hasColumn('leave_policies', 'monthly_accrual_amount')) {
                $columnsToDrop[] = 'monthly_accrual_amount';
            }
            if (Schema::hasColumn('leave_policies', 'carry_forward_quarter_only')) {
                $columnsToDrop[] = 'carry_forward_quarter_only';
            }
            if (Schema::hasColumn('leave_policies', 'carry_forward_max')) {
                $columnsToDrop[] = 'carry_forward_max';
            }
            if (Schema::hasColumn('leave_policies', 'carry_forward_reset')) {
                $columnsToDrop[] = 'carry_forward_reset';
            }
            if (Schema::hasColumn('leave_policies', 'carry_forward_reset_notification_days')) {
                $columnsToDrop[] = 'carry_forward_reset_notification_days';
            }
            if (Schema::hasColumn('leave_policies', 'requires_document_after_days')) {
                $columnsToDrop[] = 'requires_document_after_days';
            }
            if (Schema::hasColumn('leave_policies', 'allow_future_dated_requests')) {
                $columnsToDrop[] = 'allow_future_dated_requests';
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
            //
        });
    }
};
