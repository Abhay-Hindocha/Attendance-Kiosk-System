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
        Schema::table('leave_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_requests', 'estimated_days')) {
                $table->decimal('estimated_days', 5, 2)->default(0)->after('status');
            }
            if (!Schema::hasColumn('leave_requests', 'sandwich_applied_days')) {
                $table->decimal('sandwich_applied_days', 5, 2)->default(0)->after('estimated_days');
            }
            if (!Schema::hasColumn('leave_requests', 'sandwich_rule_applied')) {
                $table->boolean('sandwich_rule_applied')->default(false)->after('sandwich_applied_days');
            }
            if (!Schema::hasColumn('leave_requests', 'requires_document')) {
                $table->boolean('requires_document')->default(false)->after('sandwich_rule_applied');
            }
            if (!Schema::hasColumn('leave_requests', 'attachment_path')) {
                $table->string('attachment_path')->nullable()->after('requires_document');
            }
            if (!Schema::hasColumn('leave_requests', 'documents')) {
                $table->json('documents')->nullable()->after('attachment_path');
            }
            if (!Schema::hasColumn('leave_requests', 'conflict_checks')) {
                $table->json('conflict_checks')->nullable()->after('documents');
            }
            if (!Schema::hasColumn('leave_requests', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable()->after('conflict_checks');
            }
            if (!Schema::hasColumn('leave_requests', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('submitted_at');
            }
            if (!Schema::hasColumn('leave_requests', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('cancelled_at');
            }
            if (!Schema::hasColumn('leave_requests', 'rejected_at')) {
                $table->timestamp('rejected_at')->nullable()->after('approved_at');
            }
            if (!Schema::hasColumn('leave_requests', 'clarification_requested_at')) {
                $table->timestamp('clarification_requested_at')->nullable()->after('rejected_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['estimated_days', 'sandwich_applied_days', 'sandwich_rule_applied', 'requires_document', 'attachment_path', 'documents', 'conflict_checks', 'submitted_at', 'cancelled_at', 'approved_at', 'rejected_at', 'clarification_requested_at']);
        });
    }
};
