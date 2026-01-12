<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    public function index()
    {
        return response()->json(Employee::with(['policy', 'leavePolicies'])->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|string|unique:employees',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:employees',
            'phone' => 'nullable|string|max:20',
            'emergency_contact_number' => 'nullable|string|max:20',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'department' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'join_date' => 'nullable|date',
            'face_enrolled' => 'boolean',
            'policy_id' => 'required|exists:policies,id',
            'status' => 'required|in:active,inactive,on_leave',
            'leave_reason' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'leave_policy_ids' => 'nullable|array',
            'leave_policy_ids.*' => 'integer|exists:leave_policies,id',
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        if ($request->hasFile('profile_photo')) {
            $data['profile_photo'] = $request->file('profile_photo')->store('profile_photos', 'public');
        }

        $leavePolicyIds = collect($request->input('leave_policy_ids', []))
            ->filter()
            ->unique()
            ->toArray();

        $employee = Employee::create($data);

        if (!empty($leavePolicyIds)) {
            $employee->leavePolicies()->syncWithPivotValues($leavePolicyIds, ['assigned_at' => now()]);
        }

        return response()->json($employee->load(['policy', 'leavePolicies']), 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee->load(['policy', 'leavePolicies']));
    }

    public function update(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'employee_id' => 'required|string|unique:employees,employee_id,' . $employee->id,
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:employees,email,' . $employee->id,
            'phone' => 'nullable|string|max:20',
            'emergency_contact_number' => 'nullable|string|max:20',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'department' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'join_date' => 'nullable|date',
            'face_enrolled' => 'boolean',
            'policy_id' => 'required|exists:policies,id',
            'status' => 'required|in:active,inactive,on_leave',
            'leave_reason' => 'nullable|string',
            'password' => 'nullable|string|min:6',
            'leave_policy_ids' => 'nullable|array',
            'leave_policy_ids.*' => 'integer|exists:leave_policies,id',
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        if ($request->hasFile('profile_photo')) {
            // Delete old photo if exists
            if ($employee->profile_photo) {
                \Storage::disk('public')->delete($employee->profile_photo);
            }
            $data['profile_photo'] = $request->file('profile_photo')->store('profile_photos', 'public');
        }

        $leavePolicyIds = collect($request->input('leave_policy_ids', []))
            ->filter()
            ->unique()
            ->toArray();

        $employee->update($data);

        if ($request->has('leave_policy_ids')) {
            $employee->leavePolicies()->syncWithPivotValues($leavePolicyIds, ['assigned_at' => now()]);
        }

        return response()->json($employee->load(['policy', 'leavePolicies']));
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json(['message' => 'Employee deleted successfully']);
    }
}
