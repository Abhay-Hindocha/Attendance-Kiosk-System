<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\PolicyController;
use App\Http\Controllers\Api\AttendanceController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Employee routes
Route::apiResource('employees', EmployeeController::class);

// Policy routes
Route::apiResource('policies', PolicyController::class);

// Attendance routes
Route::apiResource('attendances', AttendanceController::class);
Route::post('attendances/mark', [AttendanceController::class, 'markAttendance']);
