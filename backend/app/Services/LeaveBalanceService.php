<?php

namespace App\Services;

use App\Models\LeaveBalance;
use App\Models\LeaveAccrualLog;
use App\Models\LeaveTransaction;
use Carbon\Carbon;

class LeaveBalanceService
{
    public function getCurrentBalance(int $employeeId, int $policyId): float
    {
        $balance = LeaveBalance::where('employee_id', $employeeId)
            ->where('leave_policy_id', $policyId)
            ->first();

        if (!$balance) {
            return 0;
        }

        return $balance->balance;
    }

    public function updateBalance(int $employeeId, int $policyId, float $amount, string $type, ?string $notes = null): void
    {
        $balance = LeaveBalance::firstOrCreate(
            ['employee_id' => $employeeId, 'leave_policy_id' => $policyId],
            ['year' => date('Y'), 'balance' => 0, 'accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0]
        );

        $balance->balance += $amount;
        $balance->save();

        LeaveAccrualLog::create([
            'employee_id' => $employeeId,
            'leave_policy_id' => $policyId,
            'accrual_date' => now(),
            'quantity' => $amount,
            'type' => $type,
            'notes' => $notes,
        ]);
    }

    public function deductLeave(int $employeeId, int $policyId, float $days, int $transactionId): void
    {
        $balance = LeaveBalance::where('employee_id', $employeeId)
            ->where('leave_policy_id', $policyId)
            ->first();

        if (!$balance || $balance->balance < $days) {
            throw new \Exception('Insufficient leave balance');
        }

        $balance->balance -= $days;
        $balance->pending_deduction += $days;
        $balance->save();

        // Log the deduction
        LeaveAccrualLog::create([
            'employee_id' => $employeeId,
            'leave_policy_id' => $policyId,
            'accrual_date' => now(),
            'quantity' => -$days,
            'type' => 'LEAVE_DEDUCTION',
            'notes' => "Deducted for transaction #{$transactionId}",
        ]);
    }

    public function confirmDeduction(int $employeeId, int $policyId, float $days): void
    {
        $balance = LeaveBalance::where('employee_id', $employeeId)
            ->where('leave_policy_id', $policyId)
            ->first();

        if ($balance) {
            $balance->pending_deduction = max(0, $balance->pending_deduction - $days);
            $balance->save();
        }
    }

    public function getBalancesForEmployee(int $employeeId): array
    {
        return LeaveBalance::with('policy')
            ->where('employee_id', $employeeId)
            ->get()
            ->map(function ($balance) {
                return [
                    'policy_id' => $balance->leave_policy_id,
                    'policy_name' => $balance->policy->name,
                    'current_balance' => $balance->balance,
                    'accrued_this_year' => $balance->accrued_this_year,
                    'carry_forward_balance' => $balance->carry_forward_balance,
                    'pending_deduction' => $balance->pending_deduction,
                ];
            })
            ->toArray();
    }
}
