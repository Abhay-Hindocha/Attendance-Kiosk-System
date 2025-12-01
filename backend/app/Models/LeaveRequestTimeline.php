<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveRequestTimeline extends Model
{
    use HasFactory;

    protected $fillable = [
        'leave_request_id',
        'action',
        'notes',
        'performed_by_type',
        'performed_by_id',
    ];

    public function request()
    {
        return $this->belongsTo(LeaveRequest::class, 'leave_request_id');
    }
}

