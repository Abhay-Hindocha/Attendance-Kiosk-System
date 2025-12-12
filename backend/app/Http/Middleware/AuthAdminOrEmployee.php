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
            return $next($request);
        }

        // If admin auth fails, try employee auth
        if (Auth::guard('employee')->check()) {
            return $next($request);
        }

        // If both fail, return 401
        return response()->json(['message' => 'Unauthenticated.', 'redirect_to' => '/employee/login'], 401);
    }
}
