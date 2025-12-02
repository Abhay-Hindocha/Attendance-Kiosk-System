<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveTransaction extends Model
{
    use HasFactory;

    protected $table = 'leave_requests';

    protected $fillable = [
        'employee_id',
        'leave_policy_id',
        'from_date',
        'to_date',
        'partial_day',
        'partial_session',
        'reason',
        'status',
        'estimated_days',
        'days_counted',
        'sandwich_applied_days',
        'sandwich_rule_applied',
        'requires_document',
        'attachment_path',
        'documents',
        'conflict_checks',
        'submitted_at',
        'cancelled_at',
        'approved_at',
        'rejected_at',
        'clarification_requested_at',
    ];

    protected $casts = [
        'from_date' => 'date',
        'to_date' => 'date',
        'estimated_days' => 'decimal:2',
        'days_counted' => 'decimal:2',
        'sandwich_applied_days' => 'decimal:2',
        'approved_at' => 'datetime',
        'partial_day' => 'boolean',
        'sandwich_rule_applied' => 'boolean',
        'requires_document' => 'boolean',
        'documents' => 'array',
        'conflict_checks' => 'array',
        'submitted_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'rejected_at' => 'datetime',
        'clarification_requested_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function policy()
    {
        return $this->belongsTo(LeavePolicy::class, 'leave_policy_id');
    }

    public function timelines()
    {
        return $this->hasMany(LeaveRequestTimeline::class, 'leave_request_id');
    }
}
