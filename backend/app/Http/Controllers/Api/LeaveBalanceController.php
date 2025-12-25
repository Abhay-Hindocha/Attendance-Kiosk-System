<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveAccrualLog;
use App\Models\LeaveBalance;
use App\Models\LeavePolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaveBalanceController extends Controller
{
    /**
     * Get leave balances for a specific employee.
     */
    public function index($employeeId)
    {
        $employee = Employee::findOrFail($employeeId);

        $policies = LeavePolicy::where('is_active', true)->get();

        $balances = $policies->map(function ($policy) use ($employee) {
            $balance = LeaveBalance::firstOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'year' => date('Y'),
                ],
                [
                    'balance' => 0,
                    'opening_balance' => 0,
                    'carry_forward_balance' => 0,
                    'used' => 0,
                    'accrued' => 0,
                    'accrued_this_year' => 0,
                    'pending_deduction' => 0,
                ]
            );

            return [
                'id' => $policy->id,
                'name' => $policy->name,
                'code' => $policy->code,
                'total_balance' => $balance->balance,
                'accrued' => $balance->accrued_this_year,
                'carry_forward' => $balance->carry_forward_balance,
                'used' => $balance->used,
            ];
        });

        return response()->json($balances);
    }

    /**
     * Manually adjust a leave balance.
     */
    public function adjust(Request $request, $employeeId)
    {
        $request->validate([
            'leave_policy_id' => 'required|exists:leave_policies,id',
            'type' => 'required|in:credit,debit,set',
            'amount' => 'required|numeric|min:0',
            'reason' => 'required|string|max:255',
        ]);

        $employee = Employee::findOrFail($employeeId);
        $policy = LeavePolicy::findOrFail($request->leave_policy_id);

        DB::transaction(function () use ($employee, $policy, $request) {
            $balance = LeaveBalance::firstOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'year' => date('Y'),
                ],
                [
                    'balance' => 0,
                    'opening_balance' => 0,
                    'carry_forward_balance' => 0,
                    'used' => 0,
                    'accrued' => 0,
                    'accrued_this_year' => 0,
                    'pending_deduction' => 0,
                ]
            );

            $oldBalance = $balance->balance;
            $amount = $request->amount;

            if ($request->type === 'credit') {
                $balance->accrued_this_year += $amount;
                $logType = 'manual_credit';
            } elseif ($request->type === 'debit') {
                // Deduct from accrued first, then carry forward, then opening?
                // Simplification for manual adjustment: just reduce accrued if possible, or increase used?
                // Let's reduce accrued_this_year for simplicity in tracking "current" availability
                $balance->accrued_this_year -= $amount;
                $logType = 'manual_debit';
            } elseif ($request->type === 'set') {
                // To set a balance, we adjust accrued_this_year to match target
                // specific logic depends on other fields, but let's assume we adjust the final result
                // balance = opening + accrued + carry - used.
                // We want balance = X.
                // X = opening + (accrued + diff) + carry - used
                // diff = X - (opening + accrued + carry - used)
                // diff = X - current_balance
                $diff = $amount - $oldBalance;
                $balance->accrued_this_year += $diff;
                $logType = 'manual_set';
            }

            // Recalculate total balance
            $balance->balance = $balance->opening_balance + $balance->accrued_this_year + $balance->carry_forward_balance - $balance->used - ($balance->sandwich_days_charged ?? 0);
            $balance->save();

            // Log the adjustment
            LeaveAccrualLog::create([
                'employee_id' => $employee->id,
                'leave_policy_id' => $policy->id,
                'accrual_date' => now(),
                'quantity' => $request->type === 'set' ? ($amount - $oldBalance) : ($request->type === 'debit' ? -$amount : $amount),
                'type' => $logType,
                'notes' => $request->reason,
            ]);
        });

        return response()->json(['message' => 'Leave balance adjusted successfully.']);
    }
}
