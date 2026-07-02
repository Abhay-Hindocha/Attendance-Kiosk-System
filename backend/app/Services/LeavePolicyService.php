<?php

namespace App\Services;

use App\Models\LeavePolicy;
use Illuminate\Support\Facades\Log;

class LeavePolicyService
{
    public function createPolicy(array $data, int $adminId): LeavePolicy
    {
        $policy = LeavePolicy::create($data);

        $this->logAudit($policy, 'CREATE', $adminId, $data);

        return $policy;
    }

    public function updatePolicy(LeavePolicy $policy, array $data, int $adminId): LeavePolicy
    {
        $oldData = $policy->toArray();
        $policy->update($data);

        // Adjust balances based on policy changes
        $this->adjustBalancesForPolicyChanges($policy, $oldData, $data);

        $changes = $this->getChanges($oldData, $policy->toArray());
        if (!empty($changes)) {
            $this->logAudit($policy, 'UPDATE', $adminId, $changes);
        }

        return $policy;
    }

    public function archivePolicy(LeavePolicy $policy, int $adminId): void
    {
        $policy->update(['is_active' => false]);

        $this->logAudit($policy, 'ARCHIVE', $adminId, ['is_active' => false]);
    }

    private function logAudit(LeavePolicy $policy, string $action, int $adminId, array $details): void
    {
        $message = sprintf(
            'Policy %s by Admin %d at %s',
            $action,
            $adminId,
            now()->toDateTimeString()
        );

        Log::info($message, [
            'policy_id' => $policy->id,
            'policy_name' => $policy->name,
            'details' => $details,
        ]);
    }

    private function adjustBalancesForPolicyChanges(LeavePolicy $policy, array $oldData, array $newData): void
    {
        // If carry forward is disabled, debit existing carry forward balances
        $oldCarryForward = $oldData['carry_forward_allowed'] ?? false;
        $newCarryForward = $newData['carry_forward_allowed'] ?? $policy->carry_forward_allowed;
        if ($oldCarryForward && !$newCarryForward) {
            $this->debitCarryForwardBalances($policy);
        }

        // If monthly accrual value changes, adjust future accruals
        $oldAccrual = $oldData['monthly_accrual_value'] ?? 0;
        $newAccrual = $newData['monthly_accrual_value'] ?? $policy->monthly_accrual_value;
        if ($oldAccrual != $newAccrual) {
            // Log the change but don't adjust existing balances
            // Future accruals will use the new value
        }

        // If annual maximum changes, check if current balances exceed new limit
        $oldMax = $oldData['annual_maximum'] ?? 0;
        $newMax = $newData['annual_maximum'] ?? $policy->annual_maximum;
        if ($oldMax != $newMax && $newMax < $oldMax) {
            $this->adjustBalancesForNewMaximum($policy, $newMax);
        }
    }

    private function debitCarryForwardBalances(LeavePolicy $policy): void
    {
        $balances = $policy->balances()->where('carry_forward_balance', '>', 0)->get();

        foreach ($balances as $balance) {
            $carryForward = $balance->carry_forward_balance;
            $balance->carry_forward_balance = 0;
            $balance->accrued_this_year -= $carryForward;
            $balance->save();

            // Log the debit
            \App\Models\LeaveAccrualLog::create([
                'employee_id' => $balance->employee_id,
                'leave_policy_id' => $policy->id,
                'accrual_date' => now(),
                'quantity' => -$carryForward,
                'type' => 'CARRY_FORWARD_DEBIT',
                'notes' => 'Carry forward debited due to policy change',
            ]);
        }
    }

    private function adjustBalancesForNewMaximum(LeavePolicy $policy, float $newMaximum): void
    {
        $currentYear = now()->year;
        $balances = $policy->balances()->where('year', $currentYear)->where('accrued_this_year', '>', $newMaximum)->get();

        foreach ($balances as $balance) {
            $excess = $balance->accrued_this_year - $newMaximum;
            $balance->accrued_this_year = $newMaximum;
            $balance->save();

            // Log the adjustment
            \App\Models\LeaveAccrualLog::create([
                'employee_id' => $balance->employee_id,
                'leave_policy_id' => $policy->id,
                'accrual_date' => now(),
                'quantity' => -$excess,
                'type' => 'MAXIMUM_ADJUSTMENT',
                'notes' => 'Balance adjusted due to reduced annual maximum',
            ]);
        }
    }

    private function getChanges(array $old, array $new): array
    {
        $changes = [];
        foreach ($new as $key => $value) {
            if (isset($old[$key]) && $old[$key] != $value) {
                $changes[$key] = ['old' => $old[$key], 'new' => $value];
            }
        }
        return $changes;
    }
}
