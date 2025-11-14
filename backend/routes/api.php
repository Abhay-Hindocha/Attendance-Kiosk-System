<?php

// This file defines all the API routes for the Attendance Kiosk System.
// Routes are organized into public (no authentication needed) and protected (authentication required) groups.
// Public routes are used by the kiosk for attendance marking, while protected routes are for admin management.

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeeController; // Controller for employee CRUD operations
use App\Http\Controllers\Api\PolicyController;   // Controller for attendance policy management
use App\Http\Controllers\Api\AttendanceController; // Controller for attendance records and statistics
use App\Http\Controllers\Api\FaceController;     // Controller for face recognition features
use App\Http\Controllers\Api\AuthController;     // Controller for authentication (login/logout)
use App\Http\Controllers\Api\HolidayController;  // Controller for holiday management

// Authentication routes - These handle user login and session management
Route::post('/login', [AuthController::class, 'login']); // Endpoint for user login
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum'); // Endpoint for user logout (requires authentication)
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum'); // Get current authenticated user info

// Public routes - These don't require authentication and are used by the attendance kiosk
Route::post('faces/recognize', [FaceController::class, 'recognize']); // Recognize faces for attendance (used by kiosk)
Route::post('attendances/mark', [AttendanceController::class, 'markAttendance']); // Mark attendance (check in/out) - public for kiosk use

// Protected routes - These require authentication and are used by admin users for management
Route::middleware('auth:sanctum')->group(function () {
    // Employee routes - CRUD operations for managing employee records
    Route::apiResource('employees', EmployeeController::class); // Standard RESTful routes for employees (index, store, show, update, destroy)

    // Policy routes - CRUD operations for managing attendance policies
    Route::apiResource('policies', PolicyController::class); // Standard RESTful routes for policies

    // Holiday routes - CRUD operations for managing public holidays
    Route::apiResource('holidays', HolidayController::class); // Standard RESTful routes for holidays

    // Attendance routes - CRUD operations and additional statistics/reporting endpoints
    Route::apiResource('attendances', AttendanceController::class); // Standard RESTful routes for attendances
    Route::get('attendance/stats', [AttendanceController::class, 'getStats']); // Get overall attendance statistics
    Route::get('attendance/departments', [AttendanceController::class, 'getDepartmentStats']); // Get attendance stats by department
    Route::get('attendance/trends', [AttendanceController::class, 'getAttendanceTrends']); // Get attendance trends over time
    Route::get('attendance/live', [AttendanceController::class, 'getLiveActivity']); // Get live attendance activity
    Route::get('attendance/present-today', [AttendanceController::class, 'getPresentToday']); // Get employees present today
    Route::get('attendance/absent-today', [AttendanceController::class, 'getAbsentToday']); // Get employees absent today
    Route::get('attendance/on-leave-today', [AttendanceController::class, 'getOnLeaveToday']); // Get employees on leave today
    Route::get('attendance/late-arrivals-today', [AttendanceController::class, 'getLateArrivalsToday']); // Get late arrivals today
    Route::get('attendance/early-departures-today', [AttendanceController::class, 'getEarlyDeparturesToday']); // Get early departures today
    Route::get('attendance/employee/{employeeId}/{year}/{month}', [AttendanceController::class, 'getEmployeeMonthlyAttendance']); // Get monthly attendance for specific employee
    Route::get('attendance/export/employee/{employeeId}/{year}/{month}', [AttendanceController::class, 'exportEmployeeMonthlyAttendance']); // Export monthly attendance data

    // Face recognition routes - Enrollment and unenrollment require authentication
    Route::post('faces/enroll', [FaceController::class, 'enroll']); // Enroll a new face for recognition
    Route::post('faces/unenroll', [FaceController::class, 'unenroll']); // Remove a face from recognition system
});
