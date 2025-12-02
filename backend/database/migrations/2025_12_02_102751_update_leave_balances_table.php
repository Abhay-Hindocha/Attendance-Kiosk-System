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
        Schema::table('leave_balances', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_balances', 'year')) {
                $table->unsignedSmallInteger('year')->default(date('Y'));
            }
            if (!Schema::hasColumn('leave_balances', 'quarter')) {
                $table->unsignedTinyInteger('quarter')->nullable();
            }
            if (!Schema::hasColumn('leave_balances', 'opening_balance')) {
                $table->decimal('opening_balance', 6, 2)->default(0);
            }
            if (!Schema::hasColumn('leave_balances', 'accrued')) {
                $table->decimal('accrued', 6, 2)->default(0);
            }
            if (!Schema::hasColumn('leave_balances', 'used')) {
                $table->decimal('used', 6, 2)->default(0);
            }
            if (!Schema::hasColumn('leave_balances', 'carried_forward')) {
                $table->decimal('carried_forward', 6, 2)->default(0);
            }
            if (!Schema::hasColumn('leave_balances', 'reset')) {
                $table->decimal('reset', 6, 2)->default(0);
            }
            if (!Schema::hasColumn('leave_balances', 'closing_balance')) {
                $table->decimal('closing_balance', 6, 2)->default(0);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->dropColumn([
                'year',
                'quarter',
                'opening_balance',
                'accrued',
                'used',
                'carried_forward',
                'reset',
                'closing_balance',
            ]);
        });
    }
};
