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
        'carry_forward_enabled',
        'carry_forward_quarter_cap',
        'carry_forward_reset_mode',
        'auto_reset_quarter_end',
        'reset_notice_days',
        'sandwich_rule_enabled',
        'eligibility_departments',
        'eligibility_designations',
        'is_active',
        'max_balance',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'monthly_accrual_value' => 'decimal:2',
        'accrual_day_of_month' => 'integer',
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

