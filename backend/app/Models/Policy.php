<?php

// This is the Policy model, which defines attendance policies for employees.
// Policies control working hours, breaks, late/early tracking, and other attendance rules.

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Policy extends Model
{
    use HasFactory; // Enables the use of model factories for testing and seeding

    // These are the fields that can be mass-assigned when creating or updating a policy
    // Mass assignment allows setting multiple attributes at once for convenience and security
    protected $fillable = [
        'name',                  // Name of the policy (e.g., "Standard Office Hours")
        'status',                // Status of the policy (active/inactive)
        'effective_from',        // Date when this policy becomes effective
        'effective_to',          // Date when this policy expires (optional)
        'include_break',         // Whether to include break time in calculations
        'break_hours',           // Hours allowed for break
        'break_minutes',         // Minutes allowed for break
        'full_day_hours',        // Hours required for a full day
        'full_day_minutes',      // Minutes required for a full day
        'half_day_hours',        // Hours required for a half day
        'half_day_minutes',      // Minutes required for a half day
        'enable_late_tracking',  // Whether to track late arrivals
        'work_start_time',       // Official start time for work
        'late_grace_period',     // Grace period in minutes for late arrivals
        'enable_early_tracking', // Whether to track early departures
        'work_end_time',         // Official end time for work
        'early_grace_period'     // Grace period in minutes for early departures
    ];

    // These fields will be automatically cast to the specified types when retrieved from the database
    protected $casts = [
        'effective_from' => 'date',         // Cast to date object
        'effective_to' => 'date',           // Cast to date object
        'include_break' => 'boolean',       // Cast to boolean
        'enable_late_tracking' => 'boolean', // Cast to boolean
        'enable_early_tracking' => 'boolean', // Cast to boolean
    ];

    // Relationship: A policy can be assigned to many employees
    // This allows us to get all employees following a specific policy
    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}
