<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeavePolicyAssignment;
use App\Services\PolicyAssignmentService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class PolicyAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $query = LeavePolicyAssignment::with(['employee', 'policy']);

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('policy_id')) {
            $query->where('leave_policy_id', $request->policy_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $assignments = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($assignments);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'leave_policy_id' => 'required|integer|exists:leave_policies,id',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after:effective_from',
        ]);

        $service = app(PolicyAssignmentService::class);
        $assignment = $service->assignPolicyToEmployee(
            $request->leave_policy_id,
            $request->employee_id,
            $request->effective_from ? Carbon::parse($request->effective_from) : null,
            $request->effective_to ? Carbon::parse($request->effective_to) : null
        );

        return response()->json($assignment, 201);
    }

    public function show(LeavePolicyAssignment $assignment)
    {
        return response()->json($assignment->load(['employee', 'policy']));
    }

    public function update(Request $request, LeavePolicyAssignment $assignment)
    {
        $request->validate([
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after:effective_from',
            'is_active' => 'boolean',
        ]);

        $assignment->update($request->only(['effective_from', 'effective_to', 'is_active']));

        return response()->json($assignment);
    }

    public function destroy(LeavePolicyAssignment $assignment)
    {
        $assignment->delete();

        return response()->json(['message' => 'Assignment deleted successfully']);
    }

    public function bulkAssign(Request $request)
    {
        $request->validate([
            'leave_policy_id' => 'required|integer|exists:leave_policies,id',
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'integer|exists:employees,id',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after:effective_from',
        ]);

        $service = app(PolicyAssignmentService::class);
        $results = $service->bulkAssignPolicy(
            $request->leave_policy_id,
            $request->employee_ids,
            $request->effective_from ? Carbon::parse($request->effective_from) : null,
            $request->effective_to ? Carbon::parse($request->effective_to) : null
        );

        return response()->json([
            'message' => 'Bulk assignment completed',
            'results' => $results,
        ]);
    }

    public function bulkUnassign(Request $request)
    {
        $request->validate([
            'leave_policy_id' => 'required|integer|exists:leave_policies,id',
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'integer|exists:employees,id',
        ]);

        $service = app(PolicyAssignmentService::class);
        $results = $service->bulkUnassignPolicy(
            $request->leave_policy_id,
            $request->employee_ids
        );

        return response()->json([
            'message' => 'Bulk unassignment completed',
            'results' => $results,
        ]);
    }
}
