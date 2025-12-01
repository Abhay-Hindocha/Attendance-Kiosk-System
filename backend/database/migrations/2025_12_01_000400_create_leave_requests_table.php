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
        if (!Schema::hasTable('leave_requests')) {
            Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('leave_policy_id')->constrained()->cascadeOnDelete();
            $table->date('from_date');
            $table->date('to_date');
            $table->boolean('partial_day')->default(false);
            $table->enum('partial_session', ['first_half', 'second_half', 'custom'])->nullable();
            $table->text('reason')->nullable();
            $table->string('status')->default('pending');
            $table->decimal('estimated_days', 5, 2)->default(0);
            $table->decimal('sandwich_applied_days', 5, 2)->default(0);
            $table->boolean('sandwich_rule_applied')->default(false);
            $table->boolean('requires_document')->default(false);
            $table->string('attachment_path')->nullable();
            $table->json('documents')->nullable();
            $table->json('conflict_checks')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('clarification_requested_at')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'status']);
            $table->index(['from_date', 'to_date']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};

