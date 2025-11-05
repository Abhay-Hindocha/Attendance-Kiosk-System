<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\PolicyController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\FaceController;
use App\Http\Controllers\Api\AuthController;

// Authentication routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

// Public routes (no auth required for attendance kiosk)
Route::post('faces/recognize', [FaceController::class, 'recognize']);
Route::post('attendances/mark', [AttendanceController::class, 'markAttendance']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Employee routes
    Route::apiResource('employees', EmployeeController::class);

    // Policy routes
    Route::apiResource('policies', PolicyController::class);

    // Attendance routes
    Route::apiResource('attendances', AttendanceController::class);
    Route::get('attendance/stats', [AttendanceController::class, 'getStats']);
    Route::get('attendance/departments', [AttendanceController::class, 'getDepartmentStats']);
    Route::get('attendance/trends', [AttendanceController::class, 'getAttendanceTrends']);
    Route::get('attendance/live', [AttendanceController::class, 'getLiveActivity']);
    Route::get('attendance/employee/{employeeId}/{year}/{month}', [AttendanceController::class, 'getEmployeeMonthlyAttendance']);
    Route::get('attendance/export/employee/{employeeId}/{year}/{month}', [AttendanceController::class, 'exportEmployeeMonthlyAttendance']);

    // Face recognition routes (enroll and unenroll require auth)
    Route::post('faces/enroll', [FaceController::class, 'enroll']);
    Route::post('faces/unenroll', [FaceController::class, 'unenroll']);
});
