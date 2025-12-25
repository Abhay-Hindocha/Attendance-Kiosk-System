<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthAdminOrEmployee
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Try to authenticate as admin first
        if (Auth::guard('sanctum')->check()) {
            \Log::info('AuthAdminOrEmployee: Admin authentication successful');
            Auth::shouldUse('sanctum');
            return $next($request);
        }

        // If admin auth fails, try employee auth
        if (Auth::guard('employee')->check()) {
            \Log::info('AuthAdminOrEmployee: Employee authentication successful');
            Auth::shouldUse('employee');
            return $next($request);
        }

        // If both fail, return 401
        \Log::info('AuthAdminOrEmployee: Both admin and employee authentication failed', [
            'bearer_token' => $request->bearerToken(),
            'authorization_header' => $request->header('Authorization'),
            'has_sanctum_user' => Auth::guard('sanctum')->user() ? 'yes' : 'no',
            'has_employee_user' => Auth::guard('employee')->user() ? 'yes' : 'no'
        ]);
        return response()->json(['message' => 'Unauthenticated.', 'redirect_to' => '/employee/login'], 401);
    }
}
