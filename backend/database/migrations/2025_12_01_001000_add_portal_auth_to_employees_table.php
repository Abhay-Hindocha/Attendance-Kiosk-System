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
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'password')) {
                $table->string('password')->nullable()->after('email');
            }
            if (!Schema::hasColumn('employees', 'remember_token')) {
                $table->string('remember_token', 100)->nullable()->after('password');
            }
            if (!Schema::hasColumn('employees', 'portal_role')) {
                $table->string('portal_role')->default('employee')->after('policy_id');
            }
            if (!Schema::hasColumn('employees', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['password', 'remember_token', 'portal_role', 'last_login_at']);
        });
    }
};

