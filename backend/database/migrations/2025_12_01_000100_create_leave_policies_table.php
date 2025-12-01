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
        if (Schema::hasTable('leave_policies')) {
            return;
        }

        Schema::create('leave_policies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('yearly_quota')->default(12);
            $table->decimal('monthly_accrual', 5, 2)->default(1.00);
            $table->unsignedTinyInteger('accrual_day')->default(1); // day of month accrual runs
            $table->boolean('join_date_proration')->default(true);
            $table->boolean('carry_forward_enabled')->default(true);
            $table->unsignedTinyInteger('carry_forward_quarter_cap')->default(3);
            $table->string('carry_forward_reset_mode')->default('quarterly');
            $table->boolean('auto_reset_quarter_end')->default(true);
            $table->unsignedTinyInteger('reset_notice_days')->default(3);
            $table->boolean('sandwich_rule_enabled')->default(false);
            $table->json('sandwich_examples')->nullable();
            $table->json('eligibility_departments')->nullable();
            $table->json('eligibility_designations')->nullable();
            $table->json('eligibility_employee_ids')->nullable();
            $table->string('status')->default('active');
            $table->unsignedInteger('max_balance')->default(12);
            $table->timestamp('last_updated_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_policies');
    }
};

