<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceCorrectionRequest extends Model
{
    protected $fillable = [
        'employee_id',
        'attendance_id',
        'type',
        'requested_check_in',
        'requested_check_out',
        'requested_breaks',
        'reason',
        'status',
        'admin_id',
        'approved_at',
        'rejected_at',
    ];

    protected $casts = [
        'requested_check_in' => 'datetime',
        'requested_check_out' => 'datetime',
        'requested_breaks' => 'array',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }
}
