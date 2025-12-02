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
            if (!Schema::hasColumn('leave_policies', 'reset_notice_days')) {
                $table->unsignedTinyInteger('reset_notice_days')->default(3)->after('carry_forward_auto_reset_enabled');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_policies', function (Blueprint $table) {
            $table->dropColumn(['reset_notice_days', 'is_active']);
        });
    }
};
