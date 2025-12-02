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
        Schema::create('leave_accrual_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('leave_policy_id');
            $table->date('accrual_date');
            $table->decimal('quantity', 5, 2); // +ve for accrual, -ve for reset/forfeit
            $table->string('type'); // MONTHLY_ACCRUAL, QUARTER_RESET, CARRY_FORWARD, MANUAL_ADJUSTMENT
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_policy_id')->references('id')->on('leave_policies')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_accrual_logs');
    }
};
