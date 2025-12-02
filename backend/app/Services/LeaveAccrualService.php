<?php

namespace App\Services;

use App\Models\LeavePolicy;
use App\Models\LeavePolicyAssignment;
use App\Models\LeaveAccrualLog;
use App\Models\LeaveBalance;
use App\Models\LeaveTransaction;
use App\Models\Employee;
use App\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;

class LeaveAccrualService
{
    public function runMonthlyAccrual(Carbon $runDate): void
    {
        $policies = LeavePolicy::where('is_active', true)
            ->where('monthly_accrual_enabled', true)
            ->get();

        foreach ($policies as $policy) {
            $this->accrueForPolicy($policy, $runDate);
        }
    }

    private function accrueForPolicy(LeavePolicy $policy, Carbon $runDate): void
    {
        $assignments = LeavePolicyAssignment::where('leave_policy_id', $policy->id)
            ->where('is_active', true)
            ->where(function ($query) use ($runDate) {
                $query->whereNull('effective_from')
                      ->orWhere('effective_from', '<=', $runDate);
            })
            ->where(function ($query) use ($runDate) {
                $query->whereNull('effective_to')
                      ->orWhere('effective_to', '>=', $runDate);
            })
            ->get();

        foreach ($assignments as $assignment) {
            $employee = $assignment->employee;

            // Check join date proration
            if ($policy->join_date_proration_rule === 'ACCRUE_FROM_NEXT_MONTH') {
                if ($employee->joining_date && $employee->joining_date->format('Y-m') === $runDate->format('Y-m')) {
                    continue; // Skip accrual for the joining month
                }
            }

            // Check annual maximum
            $accruedThisYear = LeaveAccrualLog::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->whereYear('accrual_date', $runDate->year)
                ->sum('quantity');

            if ($accruedThisYear >= $policy->annual_maximum) {
                continue;
            }

            $accrualAmount = min($policy->monthly_accrual_value, $policy->annual_maximum - $accruedThisYear);

            LeaveAccrualLog::create([
                'employee_id' => $employee->id,
                'leave_policy_id' => $policy->id,
                'accrual_date' => $runDate,
                'quantity' => $accrualAmount,
                'type' => 'MONTHLY_ACCRUAL',
            ]);

            // Update balance
            $balance = \App\Models\LeaveBalance::firstOrCreate(
                ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id],
                ['year' => date('Y'), 'balance' => 0, 'accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0]
            );
            $balance->balance += $accrualAmount;
            $balance->accrued_this_year += $accrualAmount;
            $balance->last_accrued_at = $runDate;
            $balance->save();
        }
    }

    public function runQuarterEndProcess(Carbon $quarterEndDate): void
    {
        $quarter = $this->getQuarter($quarterEndDate);
        $year = $quarterEndDate->year;

        $policies = LeavePolicy::where('is_active', true)
            ->where('carry_forward_allowed', true)
            ->where('carry_forward_reset_frequency', 'QUARTERLY')
            ->get();

        foreach ($policies as $policy) {
            $this->processQuarterEndForPolicy($policy, $year, $quarter, $quarterEndDate);
        }
    }

    private function processQuarterEndForPolicy(LeavePolicy $policy, int $year, int $quarter, Carbon $quarterEndDate): void
    {
        $assignments = LeavePolicyAssignment::where('leave_policy_id', $policy->id)
            ->where('is_active', true)
            ->get();

        foreach ($assignments as $assignment) {
            $employee = $assignment->employee;

            // Calculate unused balance for the quarter
            $accrued = LeaveAccrualLog::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->whereYear('accrual_date', $year)
                ->whereRaw('QUARTER(accrual_date) = ?', [$quarter])
                ->sum('quantity');

            $used = LeaveTransaction::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->where('status', 'APPROVED')
                ->whereYear('approved_at', $year)
                ->whereRaw('QUARTER(approved_at) = ?', [$quarter])
                ->sum('days_counted');

            $unused = $accrued - $used;
            $carryForward = min($unused, $policy->carry_forward_max_per_quarter);

            if ($carryForward > 0) {
                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $quarterEndDate,
                    'quantity' => $carryForward,
                    'type' => 'CARRY_FORWARD',
                    'notes' => "Carried forward from Q{$quarter} {$year}",
                ]);
            }

            $reset = $unused - $carryForward;
            if ($reset > 0) {
                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $quarterEndDate,
                    'quantity' => -$reset,
                    'type' => 'QUARTER_RESET',
                    'notes' => "Reset/forfeited from Q{$quarter} {$year}",
                ]);
            }
        }
    }

    public function sendPreResetNotifications(Carbon $notificationDate): void
    {
        $policies = LeavePolicy::where('carry_forward_auto_reset_enabled', true)
            ->where('reset_notice_days', '>', 0)
            ->get();

        foreach ($policies as $policy) {
            $quarterEnd = $this->getNextQuarterEnd($notificationDate);
            $noticeDate = $quarterEnd->copy()->subDays($policy->reset_notice_days);

            if ($notificationDate->isSameDay($noticeDate)) {
                $this->notifyEmployeesForPolicy($policy, $quarterEnd);
            }
        }
    }

    private function notifyEmployeesForPolicy(LeavePolicy $policy, Carbon $quarterEnd): void
    {
        $assignments = LeavePolicyAssignment::where('leave_policy_id', $policy->id)
            ->where('is_active', true)
            ->get();

        foreach ($assignments as $assignment) {
            $employee = $assignment->employee;
            $balance = app(LeaveBalanceService::class)->getCurrentBalance($employee->id, $policy->id);

            if ($balance > 0) {
                // Send notification (implement actual notification logic)
                // Notification::send($employee, new QuarterEndResetNotification($policy, $balance, $quarterEnd));
            }
        }
    }

    private function getQuarter(Carbon $date): int
    {
        return ceil($date->month / 3);
    }

    private function getNextQuarterEnd(Carbon $date): Carbon
    {
        $quarter = $this->getQuarter($date);
        $year = $date->year;

        if ($quarter == 4) {
            return Carbon::create($year, 12, 31);
        }

        return Carbon::create($year, $quarter * 3, $quarter == 1 ? 31 : ($quarter == 2 ? 30 : 30));
    }
}
