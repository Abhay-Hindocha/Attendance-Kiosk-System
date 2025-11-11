<?php

// This is the Attendance model, which records employee attendance data.
// It tracks check-in/check-out times, status, and related break records.

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory; // Enables the use of model factories for testing and seeding

    // These are the fields that can be mass-assigned when creating or updating attendance records
    // Mass assignment allows setting multiple attributes at once for convenience and security
    protected $fillable = [
        'employee_id',  // Foreign key linking to the employee
        'check_in',     // Timestamp when employee checked in
        'check_out',    // Timestamp when employee checked out (nullable)
        'date',         // Date of the attendance record
        'status',       // Status of attendance (present, absent, late, etc.)
        'scan_count',   // Number of times face was scanned for this attendance
        'scan_times'    // Array of timestamps for each scan
    ];

    // These fields will be automatically cast to the specified types when retrieved from the database
    protected $casts = [
        'check_in' => 'datetime',  // Cast to datetime object
        'check_out' => 'datetime', // Cast to datetime object
        'date' => 'date',          // Cast to date object
        'scan_times' => 'array',   // Cast to array (for multiple scan timestamps)
    ];

    // Relationship: An attendance record belongs to one employee
    // This allows us to access the employee details for this attendance
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    // Relationship: An attendance record can have many break records
    // This allows us to track breaks taken during the workday
    public function breaks()
    {
        return $this->hasMany(BreakRecord::class, 'attendance_id');
    }
}
