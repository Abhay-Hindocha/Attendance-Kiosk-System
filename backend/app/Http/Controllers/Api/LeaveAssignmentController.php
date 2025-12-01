<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeavePolicy;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeaveAssignmentController extends Controller
{
    public function index(Employee $employee)
    {
        $assignments = $employee->leavePolicies()
            ->withPivot('assigned_at')
            ->get();

        return response()->json($assignments);
    }

    public function store(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'policy_ids' => ['required', 'array', 'min:1'],
            'policy_ids.*' => [
                'integer',
                Rule::exists('leave_policies', 'id')->where(fn ($q) => $q->where('status', '!=', 'archived')),
            ],
        ]);

        $policyIds = collect($data['policy_ids'])->unique()->values();
        $employee->leavePolicies()->syncWithPivotValues($policyIds, ['assigned_at' => now()]);

        // Update leave balances for assigned policies
        foreach ($policyIds as $policyId) {
            $policy = LeavePolicy::find($policyId);
            LeaveBalance::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policyId,
                ],
                [
                    'balance' => $policy->yearly_quota,
                    'accrued_this_year' => $policy->yearly_quota,
                    'last_accrual_date' => now(),
                ]
            );
        }

        return response()->json([
            'employee' => $employee->load('leavePolicies'),
            'message' => 'Leave policies updated for employee.',
        ]);
    }

    public function destroy(Employee $employee, LeavePolicy $leavePolicy)
    {
        $employee->leavePolicies()->detach($leavePolicy->id);

        // Reset leave balance for detached policy
        LeaveBalance::where('employee_id', $employee->id)
            ->where('leave_policy_id', $leavePolicy->id)
            ->update(['balance' => 0]);

        return response()->json(['message' => 'Leave policy detached successfully.']);
    }
}

