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
        Schema::table('leave_policy_assignments', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_policy_assignments', 'effective_from')) {
                $table->date('effective_from')->nullable();
            }
            if (!Schema::hasColumn('leave_policy_assignments', 'effective_to')) {
                $table->date('effective_to')->nullable();
            }
            if (!Schema::hasColumn('leave_policy_assignments', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_policy_assignments', function (Blueprint $table) {
            $table->dropColumn([
                'effective_from',
                'effective_to',
                'is_active',
            ]);
        });
    }
};
