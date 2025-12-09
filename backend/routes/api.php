<?php

// This file defines all the API routes for the Attendance Kiosk System.
// Routes are organized into public (no authentication needed) and protected (authentication required) groups.
// Public routes are used by the kiosk for attendance marking, while protected routes are for admin management.

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeeController; // Controller for employee CRUD operations
use App\Http\Controllers\Api\PolicyController;   // Controller for attendance policy management
use App\Http\Controllers\Api\LeavePolicyController;
use App\Http\Controllers\Api\LeaveAssignmentController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\LeaveApprovalController;
use App\Http\Controllers\Api\AttendanceController; // Controller for attendance records and statistics
use App\Http\Controllers\Api\FaceController;     // Controller for face recognition features
use App\Http\Controllers\Api\AuthController;     // Controller for authentication (login/logout)
use App\Http\Controllers\Api\EmployeeAuthController;
use App\Http\Controllers\Api\EmployeePortalController;
use App\Http\Controllers\Api\AdminController;


// Authentication routes - These handle user login and session management
Route::post('/login', [AuthController::class, 'login']); // Endpoint for user login
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum'); // Endpoint for user logout (requires authentication)
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum'); // Get current authenticated user info

// Employee portal auth
Route::post('employee/login', [EmployeeAuthController::class, 'login']);
Route::post('employee/password/otp', [EmployeeAuthController::class, 'requestPasswordOtp']);
Route::post('employee/password/reset', [EmployeeAuthController::class, 'resetPassword']);

// Public routes - These don't require authentication and are used by the attendance kiosk
Route::post('faces/recognize', [FaceController::class, 'recognize']); // Recognize faces for attendance (used by kiosk)
Route::post('attendances/mark', [AttendanceController::class, 'markAttendance']); // Mark attendance (check in/out) - public for kiosk use
Route::get('attendance/live', [AttendanceController::class, 'getLiveActivity']); // Get live attendance activity - public for kiosk

// Protected routes - These require authentication and are used by admin users for management
Route::middleware('auth:sanctum')->group(function () {
    // Employee routes - CRUD operations for managing employee records
    Route::apiResource('employees', EmployeeController::class); // Standard RESTful routes for employees (index, store, show, update, destroy)

    // Policy routes - CRUD operations for managing attendance policies
    Route::apiResource('policies', PolicyController::class);
    Route::patch('policies/{policy}/toggle-status', [PolicyController::class, 'toggleStatus']);

    // Leave policies & assignments
    Route::apiResource('leave-policies', LeavePolicyController::class);
    Route::post('leave-policies/{leave_policy}/copy', [LeavePolicyController::class, 'copy']);
    Route::patch('leave-policies/{leave_policy}/toggle-status', [LeavePolicyController::class, 'toggleStatus']);

    Route::get('employees/{employee}/leave-policies', [LeaveAssignmentController::class, 'index']);
    Route::post('employees/{employee}/leave-policies', [LeaveAssignmentController::class, 'store']);
    Route::delete('employees/{employee}/leave-policies/{leave_policy}', [LeaveAssignmentController::class, 'destroy']);

    // Employee leave requests
    Route::get('leave/requests', [LeaveRequestController::class, 'index']);
    Route::post('leave/requests', [LeaveRequestController::class, 'store']);
    Route::get('leave/requests/{leave_request}', [LeaveRequestController::class, 'show']);
    Route::post('leave/requests/{leave_request}/cancel', [LeaveRequestController::class, 'cancel']);

    // Admin approvals
    Route::get('leave/approvals', [LeaveApprovalController::class, 'index']);
    Route::post('leave/requests/{leave_request}/approve', [LeaveApprovalController::class, 'approve']);
    Route::post('leave/requests/{leave_request}/reject', [LeaveApprovalController::class, 'reject']);
    Route::post('leave/requests/{leave_request}/clarify', [LeaveApprovalController::class, 'requestClarification']);
    Route::post('leave/requests/{leave_request}/overwrite-dates', [LeaveApprovalController::class, 'overwriteDates']);



    // Attendance routes - CRUD operations and additional statistics/reporting endpoints
    Route::apiResource('attendances', AttendanceController::class); // Standard RESTful routes for attendances
    Route::get('attendance/dashboard', [AttendanceController::class, 'getDashboardData']); // Get combined dashboard data
    // Route::get('attendance/stats', [AttendanceController::class, 'getStats']); // Get overall attendance statistics
    // Route::get('attendance/departments', [AttendanceController::class, 'getDepartmentStats']); // Get attendance stats by department
    // Route::get('attendance/trends', [AttendanceController::class, 'getAttendanceTrends']); // Get attendance trends over time
    // Route::get('attendance/live', [AttendanceController::class, 'getLiveActivity']); // Get live attendance activity
    Route::get('attendance/present-today', [AttendanceController::class, 'getPresentToday']); // Get employees present today
    Route::get('attendance/absent-today', [AttendanceController::class, 'getAbsentToday']); // Get employees absent today
    Route::get('attendance/on-leave-today', [AttendanceController::class, 'getOnLeaveToday']); // Get employees on leave today
    Route::get('attendance/late-arrivals-today', [AttendanceController::class, 'getLateArrivalsToday']); // Get late arrivals today
    Route::get('attendance/early-departures-today', [AttendanceController::class, 'getEarlyDeparturesToday']); // Get early departures today
    Route::get('attendance/employee/{employeeId}/{year}/{month}', [AttendanceController::class, 'getEmployeeMonthlyAttendance']); // Get monthly attendance for specific employee
    Route::get('attendance/export/employee/{employeeId}/{year}/{month}', [AttendanceController::class, 'exportEmployeeMonthlyAttendance']); // Export monthly attendance data
    Route::get('attendance/export/daily/employee/{employeeId}/{date}', [AttendanceController::class, 'exportEmployeeDailyAttendance']); // Export daily attendance data
    Route::get('attendance/export/custom/employee/{employeeId}/{startDate}/{endDate}', [AttendanceController::class, 'exportEmployeeCustomRangeAttendance']); // Export custom range attendance data
    Route::post('attendance/email', [AttendanceController::class, 'emailEmployeeAttendanceReport']); // Email attendance report to employee

    // Face recognition routes - Enrollment and unenrollment require authentication
    Route::post('faces/enroll', [FaceController::class, 'enroll']); // Enroll a new face for recognition
    Route::post('faces/unenroll', [FaceController::class, 'unenroll']); // Remove a face from recognition system

    // Admin routes
    Route::prefix('admin')->group(function () {
        Route::get('correction-requests', [AdminController::class, 'listCorrectionRequests']);
        Route::post('correction-requests/{id}/approve', [AdminController::class, 'approveCorrectionRequest']);
        Route::post('correction-requests/{id}/reject', [AdminController::class, 'rejectCorrectionRequest']);
        Route::post('manual-checkin', [AdminController::class, 'manualCheckIn']);
        Route::post('manual-checkout', [AdminController::class, 'manualCheckOut']);
        Route::put('attendance/{id}', [AdminController::class, 'editAttendance']);

        // New attendance correction routes
        Route::get('departments', [AdminController::class, 'getDepartments']);
        Route::get('employees-by-department', [AdminController::class, 'getEmployeesByDepartment']);
        Route::get('attendance-logs', [AdminController::class, 'getAttendanceLogs']);
        Route::post('attendance/add-new', [AdminController::class, 'addNewAttendance']);
        Route::put('attendance/{id}/update', [AdminController::class, 'updateAttendanceRecord']);
    });
});

// Employee portal protected routes - These require employee authentication
Route::middleware('auth:employee')->group(function () {
    Route::post('employee/logout', [EmployeeAuthController::class, 'logout']);
    Route::get('employee/profile', [EmployeeAuthController::class, 'profile']);

    Route::prefix('employee/portal')->group(function () {
        Route::get('dashboard', [EmployeePortalController::class, 'dashboard']);
        Route::get('leave-balances', [EmployeePortalController::class, 'leaveBalances']);
        Route::get('attendance', [EmployeePortalController::class, 'attendanceReport']);
        Route::get('holidays', [EmployeePortalController::class, 'holidays']);
        Route::get('profile', [EmployeePortalController::class, 'getProfile']);
        Route::put('profile', [EmployeePortalController::class, 'updateProfile']);
        Route::post('change-password', [EmployeePortalController::class, 'changePassword']);
        Route::get('policies', [EmployeePortalController::class, 'viewPolicies']);
        Route::post('correction-requests', [EmployeePortalController::class, 'submitCorrectionRequest']);
        Route::get('correction-requests', [EmployeePortalController::class, 'getCorrectionRequests']);
    });
});
