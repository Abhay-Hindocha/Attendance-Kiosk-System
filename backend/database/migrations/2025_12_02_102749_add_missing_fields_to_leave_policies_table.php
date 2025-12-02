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
            if (!Schema::hasColumn('leave_policies', 'monthly_accrual_enabled')) {
                $table->boolean('monthly_accrual_enabled')->default(true);
            }
            if (!Schema::hasColumn('leave_policies', 'monthly_accrual_value')) {
                $table->decimal('monthly_accrual_value', 5, 2)->default(1);
            }
            if (!Schema::hasColumn('leave_policies', 'accrual_day_of_month')) {
                $table->unsignedTinyInteger('accrual_day_of_month')->default(1);
            }
            if (!Schema::hasColumn('leave_policies', 'annual_maximum')) {
                $table->unsignedInteger('annual_maximum')->default(12);
            }
            if (!Schema::hasColumn('leave_policies', 'join_date_proration_rule')) {
                $table->string('join_date_proration_rule')->default('ACCRUE_FROM_NEXT_MONTH');
            }
            if (!Schema::hasColumn('leave_policies', 'carry_forward_allowed')) {
                $table->boolean('carry_forward_allowed')->default(true);
            }
            if (!Schema::hasColumn('leave_policies', 'carry_forward_max_per_quarter')) {
                $table->unsignedInteger('carry_forward_max_per_quarter')->default(3);
            }
            if (!Schema::hasColumn('leave_policies', 'carry_forward_reset_frequency')) {
                $table->string('carry_forward_reset_frequency')->default('QUARTERLY');
            }
            if (!Schema::hasColumn('leave_policies', 'carry_forward_auto_reset_enabled')) {
                $table->boolean('carry_forward_auto_reset_enabled')->default(true);
            }
            if (!Schema::hasColumn('leave_policies', 'reset_notice_days')) {
                $table->unsignedTinyInteger('reset_notice_days')->default(3);
            }
            if (!Schema::hasColumn('leave_policies', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
            if (!Schema::hasColumn('leave_policies', 'archived')) {
                $table->boolean('archived')->default(false);
            }
            if (!Schema::hasColumn('leave_policies', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable();
            }
            if (!Schema::hasColumn('leave_policies', 'updated_by')) {
                $table->unsignedBigInteger('updated_by')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_policies', function (Blueprint $table) {
            $table->dropColumn([
                'monthly_accrual_enabled',
                'monthly_accrual_value',
                'accrual_day_of_month',
                'annual_maximum',
                'join_date_proration_rule',
                'carry_forward_allowed',
                'carry_forward_max_per_quarter',
                'carry_forward_reset_frequency',
                'carry_forward_auto_reset_enabled',
                'reset_notice_days',
                'is_active',
                'archived',
                'created_by',
                'updated_by',
            ]);
        });
    }
};
