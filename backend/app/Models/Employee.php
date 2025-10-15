<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'name',
        'email',
        'phone',
        'department',
        'designation',
        'join_date',
        'face_enrolled',
        'policy_id'
    ];

    public function policy()
    {
        return $this->belongsTo(Policy::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}
