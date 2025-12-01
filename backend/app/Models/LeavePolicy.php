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
        'monthly_accrual',
        'accrual_day',
        'join_date_proration',
        'carry_forward_enabled',
        'carry_forward_quarter_cap',
        'carry_forward_reset_mode',
        'auto_reset_quarter_end',
        'reset_notice_days',
        'sandwich_rule_enabled',
        'sandwich_examples',
        'eligibility_departments',
        'eligibility_designations',
        'eligibility_employee_ids',
        'status',
        'max_balance',
        'last_updated_at',
    ];

    protected $casts = [
        'monthly_accrual' => 'float',
        'join_date_proration' => 'boolean',
        'carry_forward_enabled' => 'boolean',
        'auto_reset_quarter_end' => 'boolean',
        'sandwich_rule_enabled' => 'boolean',
        'sandwich_examples' => 'array',
        'eligibility_departments' => 'array',
        'eligibility_designations' => 'array',
        'eligibility_employee_ids' => 'array',
        'last_updated_at' => 'datetime',
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

