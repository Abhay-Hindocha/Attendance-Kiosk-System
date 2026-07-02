<?php

namespace App\Services;

use App\Models\LeaveBalance;
use App\Models\LeavePolicy;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class LeaveService
{
    /**
     * Calculate prorated leave balance for new assignment based on join date
     */
    public function calculateProratedBalance(LeavePolicy $policy, Carbon $joinDate): float
    {
        if (!$policy->join_date_proration) {
            return $policy->yearly_quota;
        }

        $currentYear = now()->year;
        $yearStart = Carbon::create($currentYear, 1, 1);
        $yearEnd = Carbon::create($currentYear, 12, 31);

        // If joined this year, calculate days from join date to year end
        if ($joinDate->year === $currentYear) {
            $daysInYear = $yearStart->diffInDays($yearEnd) + 1;
            $daysRemaining = $joinDate->diffInDays($yearEnd) + 1;
            return round(($policy->yearly_quota / $daysInYear) * $daysRemaining, 2);
        }

        // If joined previous years, full quota
        return $policy->yearly_quota;
    }

    /**
     * Accrue monthly leave for all employees
     */
    public function accrueMonthlyLeaves()
    {
        $today = now();

        // Find all active policies (assuming monthly accrual for all)
        $policies = LeavePolicy::where('status', 'active')
            ->get();

        foreach ($policies as $policy) {
            $this->accrueForPolicy($policy, $today);
        }
    }

    /**
     * Accrue leaves for a specific policy
     */
    private function accrueForPolicy(LeavePolicy $policy, Carbon $date)
    {
        $balances = LeaveBalance::where('leave_policy_id', $policy->id)->get();

        foreach ($balances as $balance) {
            if ($policy->monthly_accrual_value > 0) {
                // Monthly accrual policies
                // Skip if already accrued this month
                if ($balance->last_accrual_date && $balance->last_accrual_date->format('Y-m') === $date->format('Y-m')) {
                    continue;
                }

                $accrualAmount = $policy->monthly_accrual_value;

                // Check max balance
                $newBalance = $balance->balance + $accrualAmount;
                if ($newBalance > $policy->annual_maximum) {
                    $accrualAmount = $policy->annual_maximum - $balance->balance;
                    if ($accrualAmount <= 0) {
                        continue; // Already at max
                    }
                }

                $balance->increment('balance', $accrualAmount);
                $balance->increment('accrued_this_year', $accrualAmount);
                $balance->last_accrual_date = $date;
                $balance->save();
            } else {
                // Yearly quota policies: reset balance to yearly_quota in January
                if ($date->month === 1) {
                    // Reset only if not already reset this year
                    if (!$balance->last_accrual_date || $balance->last_accrual_date->year !== $date->year) {
                        $balance->balance = $policy->yearly_quota;
                        $balance->accrued_this_year = 0;
                        $balance->used = 0;
                        $balance->carried_forward = 0;
                        $balance->carry_forward_balance = 0;
                        $balance->pending_deduction = 0;
                        $balance->last_accrual_date = $date;
                        $balance->save();
                    }
                }
                // No accrual for other months
            }
        }
    }

    /**
     * Calculate pending deduction for an employee
     */
    public function calculatePendingDeduction(int $employeeId): array
    {
        $pendingRequests = LeaveRequest::where('employee_id', $employeeId)
            ->whereIn('status', ['pending', 'clarification'])
            ->get();

        $deductions = [];
        foreach ($pendingRequests as $request) {
            $totalDays = $request->estimated_days + $request->sandwich_applied_days;

            $deductions[$request->leave_policy_id] = ($deductions[$request->leave_policy_id] ?? 0) + $totalDays;
        }

        return $deductions;
    }

    /**
     * Update pending deductions for employee balances
     */
    public function updatePendingDeductions(int $employeeId)
    {
        $deductions = $this->calculatePendingDeduction($employeeId);

        foreach ($deductions as $policyId => $deduction) {
            LeaveBalance::where('employee_id', $employeeId)
                ->where('leave_policy_id', $policyId)
                ->update(['pending_deduction' => $deduction]);
        }

        // Reset pending_deduction to 0 for policies with no pending requests
        LeaveBalance::where('employee_id', $employeeId)
            ->whereNotIn('leave_policy_id', array_keys($deductions))
            ->update(['pending_deduction' => 0]);
    }

    /**
     * Handle carry forward at quarter end for quarterly policies
     */
    public function processCarryForward()
    {
        // For now, process all active policies (assuming quarterly carry forward)
        // TODO: Filter by carry_forward_enabled and carry_forward_reset_mode when columns are available
        $policies = LeavePolicy::where('status', 'active')
            ->get();

        foreach ($policies as $policy) {
            $this->carryForwardForPolicy($policy);
        }
    }

    /**
     * Carry forward balances for a policy
     */
    private function carryForwardForPolicy(LeavePolicy $policy)
    {
        $balances = LeaveBalance::where('leave_policy_id', $policy->id)->get();

        foreach ($balances as $balance) {
            $carryAmount = min($balance->balance, $policy->carry_forward_max_per_quarter);

            $balance->carry_forward_balance = $carryAmount;
            $balance->balance = 0; // Reset current balance for quarterly carry forward
            // Note: accrued_this_year is not reset for quarterly policies
            $balance->save();
        }
    }

    /**
     * Get available balance for a specific policy and employee
     */
    public function getAvailableBalance(int $employeeId, int $policyId): float
    {
        $balance = LeaveBalance::where('employee_id', $employeeId)
            ->where('leave_policy_id', $policyId)
            ->first();

        if (!$balance) {
            return 0;
        }

        $policy = LeavePolicy::find($policyId);
        if ($policy && $policy->monthly_accrual_value > 0) {
            return $balance->accrued_this_year + $balance->carry_forward_balance - $balance->pending_deduction;
        } else {
            return $balance->balance - $balance->pending_deduction;
        }
    }
}
