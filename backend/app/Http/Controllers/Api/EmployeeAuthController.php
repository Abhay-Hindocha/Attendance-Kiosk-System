<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EmployeeOtpMail;
use App\Models\Employee;
use App\Models\EmployeePasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class EmployeeAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'identifier' => 'required|string',
            'password' => 'required|string',
        ]);

        $employee = Employee::where('email', $data['identifier'])
            ->orWhere('employee_id', $data['identifier'])
            ->first();

        if (!$employee || !$employee->password || !Hash::check($data['password'], $employee->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['Invalid credentials provided.'],
            ]);
        }

        if ($employee->status !== 'active') {
            throw ValidationException::withMessages([
                'identifier' => ['Your account is not active. Please contact HR.'],
            ]);
        }

        $employee->tokens()->delete();
        $token = $employee->createToken('employee-portal')->plainTextToken;
        $employee->last_login_at = now();
        $employee->save();

        return response()->json([
            'employee' => $employee->load(['policy', 'leavePolicies']),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function requestPasswordOtp(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
        ]);

        $employee = Employee::where('email', $data['email'])->first();

        if (!$employee) {
            // Do not reveal user existence
            return response()->json(['message' => 'If the email exists, an OTP has been sent.']);
        }

        $otp = random_int(100000, 999999);

        EmployeePasswordReset::create([
            'email' => $employee->email,
            'otp' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10),
        ]);

        Mail::to($employee->email)->send(new EmployeeOtpMail((string) $otp));

        return response()->json(['message' => 'OTP sent to your email.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $employee = Employee::where('email', $data['email'])->firstOrFail();

        $resetRecord = EmployeePasswordReset::where('email', $employee->email)
            ->whereNull('used_at')
            ->orderByDesc('created_at')
            ->first();

        if (!$resetRecord || $resetRecord->expires_at->isPast() || !Hash::check($data['otp'], $resetRecord->otp)) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired OTP.'],
            ]);
        }

        $employee->password = Hash::make($data['password']);
        $employee->save();

        $resetRecord->used_at = now();
        $resetRecord->save();

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function profile(Request $request)
    {
        return response()->json($request->user()->load(['policy', 'leavePolicies']));
    }
}

