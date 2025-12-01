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
    ];

    protected $casts = [
        'balance' => 'float',
        'carry_forward_balance' => 'float',
        'pending_deduction' => 'float',
        'accrued_this_year' => 'float',
        'last_accrual_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function policy()
    {
        return $this->belongsTo(LeavePolicy::class, 'leave_policy_id');
    }
}

