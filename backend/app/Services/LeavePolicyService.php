<?php

namespace App\Services;

use App\Models\LeavePolicy;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

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
        $policy->update(['archived' => true, 'is_active' => false]);

        $this->logAudit($policy, 'ARCHIVE', $adminId, ['archived' => true, 'is_active' => false]);
    }

    private function logAudit(LeavePolicy $policy, string $action, int $adminId, array $details): void
    {
        AuditLog::create([
            'entity_type' => 'LeavePolicy',
            'entity_id' => $policy->id,
            'action' => $action,
            'performed_by' => $adminId,
            'performed_at' => now(),
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
