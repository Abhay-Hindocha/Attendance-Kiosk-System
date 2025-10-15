<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Policy extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'effective_from',
        'effective_to',
        'include_break',
        'break_hours',
        'break_minutes',
        'full_day_hours',
        'full_day_minutes',
        'half_day_hours',
        'half_day_minutes',
        'enable_late_tracking',
        'work_start_time',
        'late_grace_period',
        'enable_early_tracking',
        'work_end_time',
        'early_grace_period'
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'include_break' => 'boolean',
        'enable_late_tracking' => 'boolean',
        'enable_early_tracking' => 'boolean',
    ];

    protected $appends = ['status'];

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function getStatusAttribute()
    {
        $today = now()->toDateString();
        $isActive = (is_null($this->effective_from) || $today >= $this->effective_from) &&
                    (is_null($this->effective_to) || $today <= $this->effective_to);
        return $isActive ? 'active' : 'inactive';
    }
}
