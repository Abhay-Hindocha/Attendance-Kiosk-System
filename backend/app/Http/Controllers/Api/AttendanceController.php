<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with('employee');

        // Add filtering if needed
        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Paginate results to improve performance
        $perPage = $request->get('per_page', 15);
        $attendances = $query->paginate($perPage);

        return response()->json($attendances);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'date' => 'required|date',
            'status' => 'required|in:present,absent,late,half_day',
        ]);

        $attendance = Attendance::create($request->all());
        return response()->json($attendance->load('employee'), 201);
    }

    public function show(Attendance $attendance)
    {
        return response()->json($attendance->load('employee'));
    }

    public function update(Request $request, Attendance $attendance)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'date' => 'required|date',
            'status' => 'required|in:present,absent,late,half_day',
        ]);

        $attendance->update($request->all());
        return response()->json($attendance->load('employee'));
    }

    public function destroy(Attendance $attendance)
    {
        $attendance->delete();
        return response()->json(['message' => 'Attendance record deleted successfully']);
    }

    // Custom method for marking attendance by employee ID
    public function markAttendance(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|string|exists:employees,employee_id',
        ]);

        $employee = Employee::where('employee_id', $request->employee_id)->first();

        $today = Carbon::today()->toDateString();

        // Check if attendance already exists for today
        $existingAttendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        if ($existingAttendance) {
            return response()->json(['message' => 'Attendance already marked for today'], 400);
        }

        $attendance = Attendance::create([
            'employee_id' => $employee->id,
            'check_in' => Carbon::now(),
            'date' => $today,
            'status' => 'present',
        ]);

        return response()->json([
            'message' => 'Attendance marked successfully',
            'attendance' => $attendance->load('employee')
        ], 201);
    }
}
