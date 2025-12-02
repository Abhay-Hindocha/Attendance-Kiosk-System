<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeavePolicy;
use App\Services\LeaveService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeaveAssignmentController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'leave_policy_id' => ['required', 'exists:leave_policies,id'],
            'effective_date' => ['nullable', 'date'],
        ]);

        $employee = Employee::findOrFail($data['employee_id']);
        $policy = LeavePolicy::findOrFail($data['leave_policy_id']);
        $effectiveDate = $data['effective_date'] ? Carbon::parse($data['effective_date']) : now();

        // Check if assignment already exists
        $existing = LeaveBalance::where('employee_id', $employee->id)
            ->where('leave_policy_id', $policy->id)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Employee is already assigned to this leave policy.'], 422);
        }

        $leaveService = new LeaveService();
        $initialBalance = $leaveService->calculateProratedBalance($policy, $employee->join_date ?? $effectiveDate);

        LeaveBalance::create([
            'employee_id' => $employee->id,
            'leave_policy_id' => $policy->id,
            'year' => date('Y'),
            'balance' => $initialBalance,
            'carry_forward_balance' => 0,
            'pending_deduction' => 0,
            'accrued_this_year' => 0,
        ]);

        return response()->json(['message' => 'Leave policy assigned successfully.'], 201);
    }

    public function destroy(Request $request, LeaveBalance $balance)
    {
        // Only allow deletion if no pending requests
        if ($balance->pending_deduction > 0) {
            return response()->json(['error' => 'Cannot remove policy with pending leave requests.'], 422);
        }

        $balance->delete();

        return response()->json(['message' => 'Leave policy assignment removed successfully.']);
    }
}
