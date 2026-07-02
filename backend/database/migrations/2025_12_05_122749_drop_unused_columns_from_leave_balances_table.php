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
            $table->dropColumn(['quarter', 'accrued', 'carried_forward', 'reset', 'closing_balance']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->unsignedTinyInteger('quarter')->nullable();
            $table->float('accrued')->default(0);
            $table->float('carried_forward')->default(0);
            $table->float('reset')->default(0);
            $table->float('closing_balance')->default(0);
        });
    }
};
