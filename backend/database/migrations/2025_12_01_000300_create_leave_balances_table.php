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
        if (!Schema::hasTable('leave_balances')) {
            Schema::create('leave_balances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
                $table->foreignId('leave_policy_id')->constrained()->cascadeOnDelete();
                $table->decimal('balance', 5, 2)->default(0);
                $table->decimal('carry_forward_balance', 5, 2)->default(0);
                $table->decimal('pending_deduction', 5, 2)->default(0);
                $table->decimal('accrued_this_year', 5, 2)->default(0);
                $table->date('last_accrual_date')->nullable();
                $table->timestamps();

                $table->unique(['employee_id', 'leave_policy_id'], 'employee_policy_balance_unique');
                $table->index('last_accrual_date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_balances');
    }
};

