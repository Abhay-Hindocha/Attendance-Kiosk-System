<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Face extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'descriptors',
        'prototype'
    ];

    protected $casts = [
        'descriptors' => 'array',
        'prototype' => 'array'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
