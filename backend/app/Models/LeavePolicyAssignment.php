<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeavePolicyAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'leave_policy_id',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
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

