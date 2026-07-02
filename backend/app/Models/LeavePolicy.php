<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeavePolicy extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'yearly_quota',
        'reset_notice_days',
        'sandwich_rule_enabled',
        'eligibility_departments',
        'eligibility_designations',
        'monthly_accrual_value',
        'accrual_day_of_month',
        'annual_maximum',
        'join_date_proration_rule',
        'carry_forward_allowed',
        'carry_forward_max_per_quarter',
        'carry_forward_reset_frequency',
        'carry_forward_auto_reset_enabled',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'monthly_accrual_value' => 'decimal:2',
        'annual_maximum' => 'integer',
        'carry_forward_allowed' => 'boolean',
        'carry_forward_max_per_quarter' => 'integer',
        'carry_forward_auto_reset_enabled' => 'boolean',
        'sandwich_rule_enabled' => 'boolean',
        'eligibility_departments' => 'array',
        'eligibility_designations' => 'array',
    ];

    public function employees()
    {
        return $this->belongsToMany(Employee::class, 'leave_policy_assignments')
            ->withTimestamps()
            ->withPivot('assigned_at');
    }

    public function balances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function requests()
    {
        return $this->hasMany(LeaveRequest::class);
    }
}

