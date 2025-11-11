<?php

// This is the User model, which represents general users in the system.
// This is a standard Laravel User model that can be extended for different user types.
// Currently, the Admin model is used for administrative users instead.

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail; // Commented out - email verification not implemented
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable; // Base class for authentication
use Illuminate\Notifications\Notifiable; // Allows sending notifications to users

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable; // Traits for factories and notifications

    /**
     * The attributes that are mass assignable.
     * These fields can be set when creating or updating user records.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',     // Full name of the user
        'email',    // Email address for login and notifications
        'password', // Hashed password for authentication
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
