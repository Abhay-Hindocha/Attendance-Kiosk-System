<?php

// This is the Holiday model, which stores information about holidays.
// Holidays are used to exclude certain dates from attendance calculations and policies.

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    // These are the fields that can be mass-assigned when creating or updating holiday records
    // Mass assignment allows setting multiple attributes at once for convenience and security
    protected $fillable = [
        'date',        // Date of the holiday
        'name',        // Name of the holiday (e.g., "Christmas Day")
        'description', // Optional description or details about the holiday
        'type'         // Type of holiday (e.g., "national", "regional")
    ];
}
