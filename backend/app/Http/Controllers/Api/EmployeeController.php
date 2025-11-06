<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index()
    {
        return response()->json(Employee::with('policy')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|string|unique:employees',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:employees',
            'phone' => 'nullable|string|max:20',
            'department' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'join_date' => 'nullable|date',
            'face_enrolled' => 'boolean',
            'policy_id' => 'required|exists:policies,id',
            'status' => 'required|in:active,inactive,on_leave',
        ]);

        $employee = Employee::create($request->all());
        return response()->json($employee->load('policy'), 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee->load('policy'));
    }

    public function update(Request $request, Employee $employee)
    {
        $request->validate([
            'employee_id' => 'required|string|unique:employees,employee_id,' . $employee->id,
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:employees,email,' . $employee->id,
            'phone' => 'nullable|string|max:20',
            'department' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'join_date' => 'nullable|date',
            'face_enrolled' => 'boolean',
            'policy_id' => 'required|exists:policies,id',
            'status' => 'required|in:active,inactive,on_leave',
        ]);

        $employee->update($request->all());
        return response()->json($employee->load('policy'));
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json(['message' => 'Employee deleted successfully']);
    }
}
