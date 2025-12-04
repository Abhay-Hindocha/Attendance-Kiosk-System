<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'leave_policy_id',
        'balance',
        'carry_forward_balance',
        'pending_deduction',
        'accrued_this_year',
        'last_accrual_date',
        'year',
        'quarter',
        'opening_balance',
        'accrued',
        'used',
        'carried_forward',
        'reset',
        'closing_balance',
    ];

    protected $casts = [
        'balance' => 'float',
        'carry_forward_balance' => 'float',
        'pending_deduction' => 'float',
        'accrued_this_year' => 'float',
        'last_accrual_date' => 'date',
        'opening_balance' => 'float',
        'accrued' => 'float',
        'used' => 'float',
        'carried_forward' => 'float',
        'sandwich_days_charged' => 'float',
        'reset' => 'float',
        'closing_balance' => 'float',
    ];

    public function getBalanceAttribute(): float
    {
        return $this->opening_balance + $this->accrued - $this->used - $this->carried_forward - $this->sandwich_days_charged;
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function policy()
    {
        return $this->belongsTo(LeavePolicy::class, 'leave_policy_id');
    }
}

