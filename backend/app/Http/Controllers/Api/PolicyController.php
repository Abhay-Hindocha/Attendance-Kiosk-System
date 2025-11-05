<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Policy;
use Illuminate\Http\Request;

class PolicyController extends Controller
{
    public function index()
    {
        return response()->json(Policy::withCount('employees')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:policies,name',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date',
            'include_break' => 'boolean',
            'break_hours' => 'integer|min:0',
            'break_minutes' => 'integer|min:0|max:59',
            'full_day_hours' => 'integer|min:0',
            'full_day_minutes' => 'integer|min:0|max:59',
            'half_day_hours' => 'integer|min:0',
            'half_day_minutes' => 'integer|min:0|max:59',
            'enable_late_tracking' => 'boolean',
            'work_start_time' => 'required|date_format:H:i',
            'late_grace_period' => 'integer|min:0',
            'enable_early_tracking' => 'boolean',
            'work_end_time' => 'required|date_format:H:i',
            'early_grace_period' => 'integer|min:0',
        ]);

        $policy = Policy::create($request->all());
        return response()->json($policy, 201);
    }

    public function show(Policy $policy)
    {
        return response()->json($policy);
    }

    public function update(Request $request, Policy $policy)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:policies,name,' . $policy->id,
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date',
            'include_break' => 'boolean',
            'break_hours' => 'integer|min:0',
            'break_minutes' => 'integer|min:0|max:59',
            'full_day_hours' => 'integer|min:0',
            'full_day_minutes' => 'integer|min:0|max:59',
            'half_day_hours' => 'integer|min:0',
            'half_day_minutes' => 'integer|min:0|max:59',
            'enable_late_tracking' => 'boolean',
            'work_start_time' => 'required|date_format:H:i',
            'late_grace_period' => 'integer|min:0',
            'enable_early_tracking' => 'boolean',
            'work_end_time' => 'required|date_format:H:i',
            'early_grace_period' => 'integer|min:0',
        ]);

        $policy->update($request->all());
        return response()->json($policy);
    }

    public function destroy(Policy $policy)
    {
        // Check if policy has assigned employees
        if ($policy->employees()->count() > 0) {
            $assignedEmployees = $policy->employees()->select('employee_id', 'name')->get();
            return response()->json([
                'error' => 'Cannot delete policy with assigned employees',
                'assigned_employees' => $assignedEmployees
            ], 422);
        }

        $policy->delete();
        return response()->json(['message' => 'Policy deleted successfully']);
    }
}
