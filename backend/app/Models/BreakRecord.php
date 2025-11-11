<?php

// This is the BreakRecord model, which tracks break times during work hours.
// It records when employees start and end their breaks within an attendance session.

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BreakRecord extends Model
{
    use HasFactory; // Enables the use of model factories for testing and seeding

    // Specify the table name since it doesn't follow Laravel's naming convention
    // The table is named 'breaks' instead of 'break_records'
    protected $table = 'breaks';

    // These are the fields that can be mass-assigned when creating or updating break records
    // Mass assignment allows setting multiple attributes at once for convenience and security
    protected $fillable = [
        'attendance_id', // Foreign key linking to the attendance record
        'break_start',   // Timestamp when the break started
        'break_end'      // Timestamp when the break ended (nullable if break is ongoing)
    ];

    // These fields will be automatically cast to the specified types when retrieved from the database
    protected $casts = [
        'break_start' => 'datetime', // Cast to datetime object
        'break_end' => 'datetime',   // Cast to datetime object
    ];

    // Relationship: A break record belongs to one attendance record
    // This allows us to access the attendance details for this break
    public function attendance()
    {
        return $this->belongsTo(Attendance::class);
    }
}
