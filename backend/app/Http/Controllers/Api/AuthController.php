<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        Log::info('Login attempt for email: ' . $request->email);

        $admin = Admin::where('email', $request->email)->first();

        if (!$admin) {
            Log::warning('Admin not found for email: ' . $request->email);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!Hash::check($request->password, $admin->password)) {
            Log::warning('Password mismatch for admin ID: ' . $admin->id);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Delete existing tokens for this admin
        $admin->tokens()->delete();

        // Create new token
        $token = $admin->createToken('admin-token')->plainTextToken;

        return response()->json([
            'admin' => $admin,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Not authenticated'], 401);
        }

        Log::info('Logout attempt', [
            'admin_id' => $user->id,
            'admin_email' => $user->email,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        // Revoke the token that authenticated this request
        $user->currentAccessToken()->delete();

        Log::info('Admin logged out successfully', [
            'admin_id' => $user->id,
            'admin_email' => $user->email
        ]);

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        Log::info('User profile accessed', [
            'admin_id' => $request->user()->id,
            'admin_email' => $request->user()->email,
            'ip' => $request->ip()
        ]);

        return response()->json($request->user());
    }
}
