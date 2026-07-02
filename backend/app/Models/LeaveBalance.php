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
        'opening_balance',
        'used',
    ];

    protected $casts = [
        'balance' => 'float',
        'carry_forward_balance' => 'float',
        'pending_deduction' => 'float',
        'accrued_this_year' => 'float',
        'last_accrual_date' => 'date',
        'opening_balance' => 'float',
        'used' => 'float',
        'sandwich_days_charged' => 'float',
    ];

    public function getBalanceAttribute(): float
    {
        return $this->opening_balance + $this->accrued_this_year + $this->carry_forward_balance - $this->used - $this->sandwich_days_charged;
    }

    public function updateBalance(): void
    {
        $this->balance = $this->getBalanceAttribute();
        $this->save();
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

