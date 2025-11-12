<?php

// This is the Employee model, which represents an employee in the Attendance Kiosk System.
// It handles employee data and relationships with policies and attendance records.

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory; // Enables the use of model factories for testing and seeding

    // These are the fields that can be mass-assigned when creating or updating an employee
    // Mass assignment allows setting multiple attributes at once for convenience and security
    protected $fillable = [
        'employee_id',    // Unique identifier for the employee (e.g., EMP001)
        'name',           // Full name of the employee
        'email',          // Email address for notifications and login
        'phone',          // Phone number for contact
        'department',     // Department where the employee works
        'designation',    // Job title or position
        'join_date',      // Date when the employee joined the company
        'face_enrolled',  // Boolean flag indicating if face recognition is set up
        'policy_id',      // Foreign key linking to the attendance policy
        'status',         // Current status (active, inactive, on_leave, etc.)
        'leave_reason'    // Reason for leave when status is on_leave
    ];

    // Relationship: An employee belongs to one policy
    // This allows us to access the employee's attendance policy easily
    public function policy()
    {
        return $this->belongsTo(Policy::class);
    }

    // Relationship: An employee can have many attendance records
    // This allows us to get all attendance entries for a specific employee
    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}
