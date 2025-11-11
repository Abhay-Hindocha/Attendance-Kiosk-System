<?php

// This is the Face model, which stores face recognition data for employees.
// It contains facial descriptors and prototype data used for face matching during attendance.

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Face extends Model
{
    use HasFactory; // Enables the use of model factories for testing and seeding

    // These are the fields that can be mass-assigned when creating or updating face records
    // Mass assignment allows setting multiple attributes at once for convenience and security
    protected $fillable = [
        'employee_id', // Foreign key linking to the employee
        'descriptors', // Array of facial feature descriptors (numerical data from face detection)
        'prototype'    // Prototype face data used for recognition matching
    ];

    // These fields will be automatically cast to the specified types when retrieved from the database
    protected $casts = [
        'descriptors' => 'array', // Cast to array (facial feature data)
        'prototype' => 'array'   // Cast to array (prototype face data)
    ];

    // Relationship: A face record belongs to one employee
    // This allows us to access the employee details for this face data
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
