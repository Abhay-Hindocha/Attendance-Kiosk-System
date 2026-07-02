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

            if (Schema::hasColumn('leave_policies', 'carry_forward_enabled')) {
                $columnsToDrop[] = 'carry_forward_enabled';
            }
            if (Schema::hasColumn('leave_policies', 'carry_forward_quarter_cap')) {
                $columnsToDrop[] = 'carry_forward_quarter_cap';
            }
            if (Schema::hasColumn('leave_policies', 'carry_forward_reset_mode')) {
                $columnsToDrop[] = 'carry_forward_reset_mode';
            }
            if (Schema::hasColumn('leave_policies', 'auto_reset_quarter_end')) {
                $columnsToDrop[] = 'auto_reset_quarter_end';
            }
            if (Schema::hasColumn('leave_policies', 'max_balance')) {
                $columnsToDrop[] = 'max_balance';
            }
            if (Schema::hasColumn('leave_policies', 'accrual_day')) {
                $columnsToDrop[] = 'accrual_day';
            }
            if (Schema::hasColumn('leave_policies', 'monthly_accrual')) {
                $columnsToDrop[] = 'monthly_accrual';
            }
            if (Schema::hasColumn('leave_policies', 'join_date_proration')) {
                $columnsToDrop[] = 'join_date_proration';
            }
            if (Schema::hasColumn('leave_policies', 'status')) {
                $columnsToDrop[] = 'status';
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
