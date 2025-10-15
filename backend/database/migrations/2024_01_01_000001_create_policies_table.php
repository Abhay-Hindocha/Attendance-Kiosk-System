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
        Schema::create('policies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->boolean('include_break')->default(false);
            $table->integer('break_hours')->default(1);
            $table->integer('break_minutes')->default(0);
            $table->integer('full_day_hours')->default(8);
            $table->integer('full_day_minutes')->default(30);
            $table->integer('half_day_hours')->default(4);
            $table->integer('half_day_minutes')->default(30);
            $table->boolean('enable_late_tracking')->default(true);
            $table->time('work_start_time')->default('09:00');
            $table->integer('late_grace_period')->default(15);
            $table->boolean('enable_early_tracking')->default(true);
            $table->time('work_end_time')->default('18:00');
            $table->integer('early_grace_period')->default(15);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('policies');
    }
};
