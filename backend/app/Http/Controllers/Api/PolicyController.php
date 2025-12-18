<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Policy;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PolicyController extends Controller
{
    public function index()
    {
        $policies = Policy::withCount('employees')->get();

        $today = Carbon::today();

        foreach ($policies as $policy) {
            $effectiveFrom = $policy->effective_from ? Carbon::parse($policy->effective_from) : null;
            $effectiveTo = $policy->effective_to ? Carbon::parse($policy->effective_to) : null;

            $isActive = true;

            if ($effectiveFrom && $today->lt($effectiveFrom)) {
                $isActive = false;
            }

            if ($effectiveTo && $today->gt($effectiveTo)) {
                $isActive = false;
            }

            // Compute status based on dates, overriding stored status if necessary
            $policy->status = $isActive ? 'active' : 'inactive';
        }

        return response()->json($policies);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:policies,name',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date',
            'include_break' => 'boolean',
            'break_hours' => 'integer|min:0',
            'break_minutes' => 'integer|min:0|max:59',
            'full_day_hours' => 'integer|min:0',
            'full_day_minutes' => 'integer|min:0|max:59',
            'half_day_hours' => 'integer|min:0',
            'half_day_minutes' => 'integer|min:0|max:59',
            'enable_late_tracking' => 'boolean',
            'work_start_time' => 'required|date_format:H:i',
            'late_grace_period' => 'integer|min:0',
            'enable_early_tracking' => 'boolean',
            'work_end_time' => 'required|date_format:H:i',
            'early_grace_period' => 'integer|min:0',
        ]);

        $policy = Policy::create($request->all());
        return response()->json($policy, 201);
    }

    public function show(Policy $policy)
    {
        return response()->json($policy);
    }

    public function update(Request $request, Policy $policy)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:policies,name,' . $policy->id,
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date',
            'include_break' => 'boolean',
            'break_hours' => 'integer|min:0',
            'break_minutes' => 'integer|min:0|max:59',
            'full_day_hours' => 'integer|min:0',
            'full_day_minutes' => 'integer|min:0|max:59',
            'half_day_hours' => 'integer|min:0',
            'half_day_minutes' => 'integer|min:0|max:59',
            'enable_late_tracking' => 'boolean',
            'work_start_time' => 'required|date_format:H:i',
            'late_grace_period' => 'integer|min:0',
            'enable_early_tracking' => 'boolean',
            'work_end_time' => 'required|date_format:H:i',
            'early_grace_period' => 'integer|min:0',
        ]);

        $oldValues = $policy->toArray();
        $policy->update($request->all());
        $newValues = $policy->fresh()->toArray();

        Log::info('Policy updated', [
            'policy_id' => $policy->id,
            'policy_name' => $policy->name,
            'admin_id' => auth()->id(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        AuditLog::create([
            'user_id' => auth()->id(),
            'action' => 'updated',
            'model_type' => Policy::class,
            'model_id' => $policy->id,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($policy);
    }

    public function destroy(Policy $policy)
    {
        // Check if policy has assigned employees
        if ($policy->employees()->count() > 0) {
            $assignedEmployees = $policy->employees()->select('employee_id', 'name')->get();
            return response()->json([
                'error' => 'Cannot delete policy with assigned employees',
                'assigned_employees' => $assignedEmployees
            ], 422);
        }

        $policy->delete();
        return response()->json(['message' => 'Policy deleted successfully']);
    }

    public function toggleStatus(Policy $policy)
    {
        $newStatus = $policy->status === 'active' ? 'inactive' : 'active';

        if ($newStatus === 'active') {
            $today = Carbon::today();
            $effectiveFrom = $policy->effective_from ? Carbon::parse($policy->effective_from) : null;
            $effectiveTo = $policy->effective_to ? Carbon::parse($policy->effective_to) : null;

            if (($effectiveFrom && $today->lt($effectiveFrom)) || ($effectiveTo && $today->gt($effectiveTo))) {
                return response()->json(['error' => 'Policy cannot be active due today\'s date don\'t fall between effective dates.'], 422);
            }
        }

        $policy->status = $newStatus;
        $policy->save();

        return response()->json([
            'policy' => $policy,
            'message' => 'Policy status updated successfully'
        ]);
    }
}
