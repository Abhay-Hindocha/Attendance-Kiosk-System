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
        'is_active',
        'monthly_accrual_enabled',
        'monthly_accrual_value',
        'accrual_day_of_month',
        'annual_maximum',
        'join_date_proration_rule',
        'carry_forward_allowed',
        'carry_forward_max_per_quarter',
        'carry_forward_reset_frequency',
        'carry_forward_auto_reset_enabled',
        'sandwich_rule_enabled',
        'eligible_departments',
        'eligible_designations',
        'archived',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'monthly_accrual_enabled' => 'boolean',
        'monthly_accrual_value' => 'decimal:2',
        'accrual_day_of_month' => 'integer',
        'annual_maximum' => 'integer',
        'carry_forward_allowed' => 'boolean',
        'carry_forward_max_per_quarter' => 'integer',
        'carry_forward_auto_reset_enabled' => 'boolean',
        'sandwich_rule_enabled' => 'boolean',
        'eligible_departments' => 'array',
        'eligible_designations' => 'array',
        'archived' => 'boolean',
        'created_by' => 'integer',
        'updated_by' => 'integer',
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

