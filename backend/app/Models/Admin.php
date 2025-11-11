<?php

// This is the Admin model, which represents administrative users in the system.
// Admins can log in, manage employees, policies, and view attendance reports.
// This model extends Laravel's Authenticatable class for authentication features.

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail; // Commented out - email verification not implemented
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable; // Base class for authentication
use Illuminate\Notifications\Notifiable; // Allows sending notifications to admins
use Laravel\Sanctum\HasApiTokens; // Enables API token authentication

class Admin extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\AdminFactory> */
    use HasApiTokens, HasFactory, Notifiable; // Traits for API tokens, factories, and notifications

    /**
     * The attributes that are mass assignable.
     * These fields can be set when creating or updating admin records.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',     // Full name of the admin user
        'email',    // Email address for login and notifications
        'password', // Hashed password for authentication
        'role',     // Role of the admin (e.g., super_admin, manager)
    ];

    /**
     * The attributes that should be hidden for serialization.
     * These fields won't be included when the model is converted to JSON/API responses.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',        // Hide password for security
        'remember_token',  // Hide remember token for security
    ];

    /**
     * Get the attributes that should be cast.
     * These define how certain fields should be automatically converted when retrieved.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime', // Cast to datetime object
            'password' => 'hashed',           // Automatically hash passwords when set
        ];
    }
}
