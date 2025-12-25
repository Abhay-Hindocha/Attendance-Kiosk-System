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
            ->where('accrual_day_of_month', $runDate->day)
            ->get();

        \Log::info("LeaveAccrualService: Found {$policies->count()} policies for accrual on {$runDate->toDateString()}");

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

            // Check eligibility
            if (!$this->isEmployeeEligible($employee, $policy)) {
                continue;
            }

            // Check if already processed this month
            $existingLog = LeaveAccrualLog::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->whereYear('accrual_date', $runDate->year)
                ->whereMonth('accrual_date', $runDate->month)
                ->where('type', 'MONTHLY_ACCRUAL')
                ->first();
            if ($existingLog) {
                continue; // Idempotent - already processed
            }

            // For policies with carry forward allowed, carry forward unused balance at the start of normal months
            if ($policy->carry_forward_allowed && !in_array($runDate->month, [1, 4, 7, 10])) {
                $this->processMonthlyCarryForward($employee, $policy, $runDate);
            }

            // For policies without carry forward, reset balance at the start of each month
            if (!$policy->carry_forward_allowed) {
                $existingResetLog = LeaveAccrualLog::where('employee_id', $employee->id)
                    ->where('leave_policy_id', $policy->id)
                    ->whereYear('accrual_date', $runDate->year)
                    ->whereMonth('accrual_date', $runDate->month)
                    ->where('type', 'MONTHLY_RESET')
                    ->first();
                if (!$existingResetLog) {
                    $balance = LeaveBalance::firstOrCreate(
                        ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id, 'year' => $runDate->year],
                        ['accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0, 'opening_balance' => 0, 'used' => 0, 'carried_forward' => 0, 'sandwich_days_charged' => 0]
                    );
                    $resetAmount = $balance->accrued_this_year;
                    if ($resetAmount > 0) {
                        LeaveAccrualLog::create([
                            'employee_id' => $employee->id,
                            'leave_policy_id' => $policy->id,
                            'accrual_date' => $runDate,
                            'quantity' => -$resetAmount,
                            'type' => 'MONTHLY_RESET',
                            'notes' => 'Monthly reset for non-carry forward policy',
                        ]);
                        $balance->accrued_this_year = 0;
                        $balance->updateBalance();
                        \Log::info("LeaveAccrualService: Reset balance for employee {$employee->id} under policy {$policy->id}: reset {$resetAmount}");
                    }
                }
            }

            $accrualAmount = 0;

            // For quarterly reset policies, reset balance at quarter starts (months 1, 4, 7, 10) before accrual
            if ($policy->carry_forward_reset_frequency === 'QUARTERLY' && in_array($runDate->month, [1, 4, 7, 10])) {
                $existingResetLog = LeaveAccrualLog::where('employee_id', $employee->id)
                    ->where('leave_policy_id', $policy->id)
                    ->whereYear('accrual_date', $runDate->year)
                    ->whereMonth('accrual_date', $runDate->month)
                    ->where('type', 'QUARTERLY_RESET')
                    ->first();
                if (!$existingResetLog) {
                    $balance = LeaveBalance::firstOrCreate(
                        ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id, 'year' => $runDate->year],
                        ['accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0, 'opening_balance' => 0, 'used' => 0, 'carried_forward' => 0, 'sandwich_days_charged' => 0]
                    );

                    // Calculate previous quarter
                    $currentQuarter = $this->getQuarter($runDate);
                    $previousQuarter = $currentQuarter - 1;
                    $previousYear = $runDate->year;
                    if ($previousQuarter == 0) {
                        $previousQuarter = 4;
                        $previousYear = $runDate->year - 1;
                    }

                    $resetAmount = $balance->accrued_this_year + $balance->carry_forward_balance;
                    if ($resetAmount > 0) {
                        LeaveAccrualLog::create([
                            'employee_id' => $employee->id,
                            'leave_policy_id' => $policy->id,
                            'accrual_date' => $runDate,
                            'quantity' => -$resetAmount,
                            'type' => 'QUARTERLY_RESET',
                            'notes' => "Reset/forfeited from Q{$previousQuarter} {$previousYear} - quarterly reset",
                        ]);
                        $balance->accrued_this_year = 0;
                        $balance->carry_forward_balance = 0;
                        $balance->updateBalance();
                        \Log::info("LeaveAccrualService: Quarterly reset for employee {$employee->id} under policy {$policy->id}: reset {$resetAmount} from Q{$previousQuarter} {$previousYear}");
                    }
                }
            }

            if ($policy->monthly_accrual_value > 0) {
                // Case 1: Monthly accrual > 0
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
            } else {
                // Case 2: Monthly accrual = 0 - add year quota directly to opening balance
                if ($runDate->month == 1) {
                    $balance = LeaveBalance::firstOrCreate(
                        ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id, 'year' => $runDate->year],
                        ['accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0, 'opening_balance' => 0, 'used' => 0, 'carried_forward' => 0, 'sandwich_days_charged' => 0]
                    );

                    // Determine maximum entitlement (year quota with proration if applicable)
                    $maxEntitlement = $this->calculateMaxEntitlement($policy, $employee, $runDate);

                    // Set opening balance to the year quota if not already set
                    if ($balance->opening_balance == 0) {
                        $balance->opening_balance = $maxEntitlement;
                        $balance->accrued_this_year = $maxEntitlement;
                        $balance->updateBalance();
                        \Log::info("LeaveAccrualService: Set opening balance to {$maxEntitlement} for employee {$employee->id} under policy {$policy->id} on {$runDate->toDateString()}");
                    }
                }
            }

            if ($accrualAmount > 0) {
                \Log::info("LeaveAccrualService: Accruing {$accrualAmount} for employee {$employee->id} ({$employee->name}) under policy {$policy->id} on {$runDate->toDateString()}");

                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $runDate,
                    'quantity' => $accrualAmount,
                    'type' => 'MONTHLY_ACCRUAL',
                ]);

                // Update balance
                $balance = LeaveBalance::firstOrCreate(
                    ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id, 'year' => $runDate->year],
                    ['accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0, 'opening_balance' => 0, 'used' => 0, 'carried_forward' => 0, 'sandwich_days_charged' => 0]
                );
                $balance->accrued_this_year += $accrualAmount;
                $balance->last_accrual_date = $runDate;
                $balance->updateBalance();

                \Log::info("LeaveAccrualService: Updated balance for employee {$employee->id}: accrued_this_year={$balance->accrued_this_year}");
            }
        }
    }

    public function runQuarterEndProcess(Carbon $quarterEndDate): void
    {
        $quarter = $this->getQuarter($quarterEndDate);
        $year = $quarterEndDate->year;

        // Process quarterly carry forward and reset
        $quarterlyPolicies = LeavePolicy::where('is_active', true)
            ->where('carry_forward_allowed', true)
            ->where('carry_forward_reset_frequency', 'QUARTERLY')
            ->get();

        foreach ($quarterlyPolicies as $policy) {
            $this->processQuarterEndForPolicy($policy, $year, $quarter, $quarterEndDate);
        }

        // Process annual carry forward and reset at year end
        if ($quarterEndDate->month === 12) {
            $annualPolicies = LeavePolicy::where('is_active', true)
                ->where('carry_forward_allowed', true)
                ->where('carry_forward_reset_frequency', 'ANNUAL')
                ->get();

            foreach ($annualPolicies as $policy) {
                $this->processYearEndForPolicy($policy, $year, $quarterEndDate);
            }

            // Also process lump-sum policies (monthly_accrual_value = 0) to create next year's balance
            $lumpSumPolicies = LeavePolicy::where('is_active', true)
                ->where('monthly_accrual_value', 0)
                ->get();

            foreach ($lumpSumPolicies as $policy) {
                $this->processYearEndForLumpSumPolicy($policy, $year, $quarterEndDate);
            }
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

            $unused = max(0, $accrued - $used);
            // For quarterly reset, carry forward is 0, reset all unused
            $carryForward = 0;
            if ($policy->carry_forward_allowed) {
                $carryForward = min($unused, $policy->carry_forward_max_per_quarter);
            }
            $reset = $unused - $carryForward;

            // Calculate previous quarter
            $previousQuarter = $quarter - 1;
            $previousYear = $year;
            if ($previousQuarter == 0) {
                $previousQuarter = 4;
                $previousYear = $year - 1;
            }

            if ($carryForward > 0) {
                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $quarterEndDate,
                    'quantity' => $carryForward,
                    'type' => 'CARRY_FORWARD',
                    'notes' => "Carried forward from Q{$previousQuarter} {$previousYear}",
                ]);
            }

            if ($reset > 0) {
                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $quarterEndDate,
                    'quantity' => -$reset,
                    'type' => 'QUARTER_RESET',
                    'notes' => "Reset/forfeited from Q{$previousQuarter} {$previousYear} - quarterly reset",
                ]);
            }

            // Update balance
            $balance = LeaveBalance::firstOrCreate(
                ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id, 'year' => $year],
                ['accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0, 'opening_balance' => 0, 'used' => 0, 'carried_forward' => 0, 'sandwich_days_charged' => 0]
            );
            $balance->carry_forward_balance = $carryForward;
            $balance->accrued_this_year = 0;
            $balance->updateBalance();
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

    private function processYearEndForPolicy(LeavePolicy $policy, int $year, Carbon $yearEndDate): void
    {
        $assignments = LeavePolicyAssignment::where('leave_policy_id', $policy->id)
            ->where('is_active', true)
            ->get();

        foreach ($assignments as $assignment) {
            $employee = $assignment->employee;

            // Calculate unused balance for the year
            $accrued = LeaveAccrualLog::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->whereYear('accrual_date', $year)
                ->sum('quantity');

            $used = LeaveTransaction::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->where('status', 'APPROVED')
                ->whereYear('approved_at', $year)
                ->sum('days_counted');

            $unused = max(0, $accrued - $used);
            $carryForward = min($unused, $policy->carry_forward_max_per_quarter); // Using same field for annual max carry forward

            if ($carryForward > 0) {
                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $yearEndDate,
                    'quantity' => $carryForward,
                    'type' => 'CARRY_FORWARD',
                    'notes' => "Carried forward from year {$year}",
                ]);
            }

            $reset = $unused - $carryForward;
            if ($reset > 0) {
                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $yearEndDate,
                    'quantity' => -$reset,
                    'type' => 'ANNUAL_RESET',
                    'notes' => "Reset/forfeited from year {$year}",
                ]);
            }

            // Update balance
            $balance = LeaveBalance::firstOrCreate(
                ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id, 'year' => $year],
                ['accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0, 'opening_balance' => 0, 'used' => 0, 'carried_forward' => 0, 'sandwich_days_charged' => 0]
            );
            $balance->carry_forward_balance += $carryForward;
            $balance->accrued_this_year -= $reset;
            $balance->updateBalance();

            // For lump-sum policies, create next year's balance with yearly quota
            if ($policy->monthly_accrual_value == 0) {
                $nextYear = $year + 1;
                $nextYearBalance = LeaveBalance::firstOrCreate(
                    ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id, 'year' => $nextYear],
                    ['accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0, 'opening_balance' => 0, 'used' => 0, 'carried_forward' => 0, 'sandwich_days_charged' => 0]
                );

                // Determine maximum entitlement (year quota with proration if applicable)
                $maxEntitlement = $this->calculateMaxEntitlement($policy, $employee, $yearEndDate->copy()->addYear());

                if ($nextYearBalance->opening_balance == 0) {
                    $nextYearBalance->opening_balance = $maxEntitlement;
                    $nextYearBalance->accrued_this_year = $maxEntitlement;
                    $nextYearBalance->updateBalance();
                    \Log::info("LeaveAccrualService: Reset next year balance to {$maxEntitlement} for employee {$employee->id} under policy {$policy->id} at year end {$yearEndDate->toDateString()}");
                }
            }
        }
    }

    private function getNextQuarterEnd(Carbon $date): Carbon
    {
        $quarter = $this->getQuarter($date);
        $year = $date->year;

        $endMonth = $quarter * 3;
        return Carbon::create($year, $endMonth, 1)->endOfMonth();
    }

    public function runQuarterlyReset(Carbon $runDate): void
    {
        // Only run on quarterly months: January, April, July, October on accrual_day_of_month
        $quarterlyMonths = [1, 4, 7, 10];
        if (!in_array($runDate->month, $quarterlyMonths) || $runDate->day !== 1) { // Assuming accrual_day_of_month = 1 for reset, adjust if needed
            return;
        }

        $quarter = $this->getQuarter($runDate);
        $year = $runDate->year;

        $policies = LeavePolicy::where('is_active', true)
            ->where('carry_forward_reset_frequency', 'QUARTERLY')
            ->get();

        \Log::info("LeaveAccrualService: Processing quarterly reset for Q{$quarter} {$year} on {$runDate->toDateString()}");

        foreach ($policies as $policy) {
            $this->processQuarterlyResetForPolicy($policy, $year, $quarter, $runDate);
        }
    }

    private function processQuarterlyResetForPolicy(LeavePolicy $policy, int $year, int $quarter, Carbon $resetDate): void
    {
        $assignments = LeavePolicyAssignment::where('leave_policy_id', $policy->id)
            ->where('is_active', true)
            ->get();

        foreach ($assignments as $assignment) {
            $employee = $assignment->employee;

            // Check eligibility
            if (!$this->isEmployeeEligible($employee, $policy)) {
                continue;
            }

            // Check if already processed this quarter
            $existingLog = LeaveAccrualLog::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->whereYear('accrual_date', $year)
                ->whereRaw('QUARTER(accrual_date) = ?', [$quarter])
                ->whereIn('type', ['QUARTER_RESET', 'CARRY_FORWARD'])
                ->first();
            if ($existingLog) {
                continue; // Idempotent - already processed
            }

            // Calculate remaining balance at quarter end
            $remainingBalance = $this->getCurrentBalance($employee->id, $policy->id, $year);

            // Calculate previous quarter
            $previousQuarter = $quarter - 1;
            $previousYear = $year;
            if ($previousQuarter == 0) {
                $previousQuarter = 4;
                $previousYear = $year - 1;
            }

            // For quarterly reset frequency, reset all balances to zero regardless of carry_forward_allowed
            if ($remainingBalance > 0) {
                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $resetDate,
                    'quantity' => -$remainingBalance,
                    'type' => 'QUARTER_RESET',
                    'notes' => "Reset/forfeited from Q{$previousQuarter} {$previousYear} - quarterly reset",
                ]);

                $balance = LeaveBalance::where('employee_id', $employee->id)
                    ->where('leave_policy_id', $policy->id)
                    ->where('year', $year)
                    ->first();
                if ($balance) {
                    $balance->accrued_this_year = 0;
                    $balance->carry_forward_balance = 0;
                    $balance->updateBalance();
                }
            }

            \Log::info("LeaveAccrualService: Processed quarterly reset for employee {$employee->id}: remaining={$remainingBalance}, carried_forward=0");
        }
    }

    private function isEmployeeEligible(Employee $employee, LeavePolicy $policy): bool
    {
        // Check department eligibility
        if ($policy->eligibility_departments && !in_array($employee->department, $policy->eligibility_departments)) {
            return false;
        }

        // Check designation eligibility
        if ($policy->eligibility_designations && !in_array($employee->designation, $policy->eligibility_designations)) {
            return false;
        }

        return true;
    }

    private function getCurrentBalance(int $employeeId, int $policyId, int $year): float
    {
        $balance = LeaveBalance::where('employee_id', $employeeId)
            ->where('leave_policy_id', $policyId)
            ->where('year', $year)
            ->first();

        return $balance ? $balance->balance : 0;
    }

    private function calculateMaxEntitlement(LeavePolicy $policy, Employee $employee, Carbon $runDate): float
    {
        if ($policy->join_date_proration_rule) {
            // Apply proration
            $proratedMax = $this->applyProration($policy->join_date_proration_rule, $policy->yearly_quota, $employee->joining_date, $runDate);
            return min($proratedMax, $policy->annual_maximum ?? $proratedMax);
        } else {
            return min($policy->yearly_quota, $policy->annual_maximum ?? $policy->yearly_quota);
        }
    }

    private function applyProration(string $rule, float $yearlyQuota, ?Carbon $joinDate, Carbon $runDate): float
    {
        if (!$joinDate) {
            return $yearlyQuota;
        }

        $monthsWorked = $joinDate->diffInMonths($runDate) + 1; // +1 to include current month
        $prorated = ($yearlyQuota / 12) * $monthsWorked;

        return min($prorated, $yearlyQuota);
    }

    private function processMonthlyCarryForward(Employee $employee, LeavePolicy $policy, Carbon $runDate): void
    {
        // Check if already processed this month
        $existingCarryForwardLog = LeaveAccrualLog::where('employee_id', $employee->id)
            ->where('leave_policy_id', $policy->id)
            ->whereYear('accrual_date', $runDate->year)
            ->whereMonth('accrual_date', $runDate->month)
            ->where('type', 'MONTHLY_CARRY_FORWARD')
            ->first();
        if ($existingCarryForwardLog) {
            return; // Idempotent - already processed
        }

        $balance = LeaveBalance::where('employee_id', $employee->id)
            ->where('leave_policy_id', $policy->id)
            ->where('year', $runDate->year)
            ->first();

        if (!$balance) {
            return;
        }

        // Calculate used this month
        $usedThisMonth = LeaveTransaction::where('employee_id', $employee->id)
            ->where('leave_policy_id', $policy->id)
            ->where('status', 'APPROVED')
            ->whereYear('approved_at', $runDate->year)
            ->whereMonth('approved_at', $runDate->month)
            ->sum('days_counted');

        // If no leave used this month, carry forward the accrued balance
        if ($usedThisMonth == 0 && $balance->accrued_this_year > 0) {
            $unused = $balance->accrued_this_year;

            // Ensure carry forward does not exceed the maximum allowed
            $maxCarryForward = $policy->carry_forward_max_per_quarter ?? 0;
            $potentialCarryForward = $balance->carry_forward_balance + $unused;
            $actualCarryForward = min($potentialCarryForward, $maxCarryForward);

            if ($actualCarryForward > $balance->carry_forward_balance) {
                $carryForwardAmount = $actualCarryForward - $balance->carry_forward_balance;

                // Carry forward the unused balance
                LeaveAccrualLog::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'accrual_date' => $runDate,
                    'quantity' => $actualCarryForward,
                    'type' => 'MONTHLY_CARRY_FORWARD',
                    'notes' => "Monthly carry forward for {$runDate->format('M Y')}",
                ]);

                $balance->carry_forward_balance = $actualCarryForward;
                $balance->updateBalance();

                \Log::info("LeaveAccrualService: Carried forward {$carryForwardAmount} for employee {$employee->id} under policy {$policy->id} on {$runDate->toDateString()}");
            }
        }

        // Reset accrued_this_year to 0 for the new month, regardless of carry forward
        $balance->accrued_this_year = 0;
        $balance->updateBalance();
    }

    private function processYearEndForLumpSumPolicy(LeavePolicy $policy, int $year, string $quarterEndDate)
    {
        $nextYear = $year + 1;
        $employees = \App\Models\Employee::whereHas('leavePolicies', function ($query) use ($policy) {
            $query->where('leave_policies.id', $policy->id);
        })->get();

        foreach ($employees as $employee) {
            // Create opening balance for next year
            LeaveBalance::firstOrCreate(
                ['employee_id' => $employee->id, 'leave_policy_id' => $policy->id, 'year' => $nextYear],
                ['accrued_this_year' => 0, 'carry_forward_balance' => 0, 'pending_deduction' => 0, 'opening_balance' => 0, 'used' => 0, 'carried_forward' => 0, 'sandwich_days_charged' => 0]
            );
        }
    }
}
