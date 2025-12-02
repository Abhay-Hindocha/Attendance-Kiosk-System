<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveAccrualLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'leave_policy_id',
        'accrual_date',
        'quantity',
        'type',
        'notes',
    ];

    protected $casts = [
        'accrual_date' => 'date',
        'quantity' => 'decimal:2',
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
