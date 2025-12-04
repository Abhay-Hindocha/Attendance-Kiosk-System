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
