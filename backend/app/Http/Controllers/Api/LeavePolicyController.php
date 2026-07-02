<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeavePolicy;
use App\Services\LeavePolicyService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;

class LeavePolicyController extends Controller
{
    public function index()
    {
        $policies = LeavePolicy::withCount('employees')
            ->orderBy('name')
            ->get();

        return response()->json($policies);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request);

        if (empty($data['code'])) {
            $data['code'] = Str::upper(Str::slug($data['name'], '_'));
        }

        // Eligibility
        $data['eligibility_departments'] = $request->input('eligibility_departments');
        $data['eligibility_designations'] = $request->input('eligibility_designations');

        // Default alignment with leave policy specifications
        $data['annual_maximum'] = $data['annual_maximum'] ?? 12;
        $data['carry_forward_allowed'] = $data['carry_forward_allowed'] ?? true;
        $data['carry_forward_max_per_quarter'] = $data['carry_forward_max_per_quarter'] ?? 3;
        $data['carry_forward_reset_frequency'] = $data['carry_forward_reset_frequency'] ?? 'QUARTERLY';
        $data['carry_forward_auto_reset_enabled'] = $data['carry_forward_auto_reset_enabled'] ?? true;
        $data['reset_notice_days'] = $data['reset_notice_days'] ?? 3;
        $data['is_active'] = $data['is_active'] ?? true;

        $adminId = auth()->id();
        $policy = app(LeavePolicyService::class)->createPolicy($data, $adminId);

        return response()->json($policy, 201);
    }

    public function show(LeavePolicy $leavePolicy)
    {
        return response()->json(
            $leavePolicy->load(['employees:id,employee_id,name,department'])
        );
    }

    public function update(Request $request, LeavePolicy $leavePolicy)
    {
        $data = $this->validatePayload($request, $leavePolicy->id);

        if (empty($data['code'])) {
            $data['code'] = $leavePolicy->code;
        }

        $data['eligibility_departments'] = $request->input('eligibility_departments');
        $data['eligibility_designations'] = $request->input('eligibility_designations');

        $adminId = auth()->id();
        $policy = app(LeavePolicyService::class)->updatePolicy($leavePolicy, $data, $adminId);

        return response()->json($policy);
    }

    public function destroy(LeavePolicy $leavePolicy)
    {
        if ($leavePolicy->employees()->exists()) {
            return response()->json([
                'error' => 'Cannot delete policy with assigned employees.',
            ], 422);
        }

        $leavePolicy->delete();

        return response()->json(['message' => 'Policy deleted successfully.']);
    }

    public function toggleStatus(LeavePolicy $leavePolicy)
    {
        $leavePolicy->is_active = !$leavePolicy->is_active;
        $leavePolicy->updated_at = now();
        $leavePolicy->save();

        return response()->json([
            'policy' => $leavePolicy,
            'message' => 'Policy status updated successfully.',
        ]);
    }

    public function copy(LeavePolicy $leavePolicy)
    {
        $duplicate = $leavePolicy->replicate();
        $duplicate->name = 'Copy of ' . $leavePolicy->name;
        $duplicate->code = Str::upper(Str::slug($duplicate->name . '-' . now()->timestamp, '_'));
        $duplicate->is_active = false;
        $duplicate->save();

        return response()->json($duplicate, 201);
    }

    protected function validatePayload(Request $request, ?int $policyId = null): array
    {
        $uniqueCodeRule = 'unique:leave_policies,code';
        $uniqueNameRule = 'unique:leave_policies,name';

        if ($policyId) {
            $uniqueCodeRule .= ',' . $policyId;
            $uniqueNameRule .= ',' . $policyId;
        }

        $rules = [
            'name' => ['required', 'string', 'max:255', $uniqueNameRule],
            'code' => ['nullable', 'string', 'max:50', $uniqueCodeRule],
            'description' => ['nullable', 'string'],
            'yearly_quota' => ['required', 'integer', 'min:0', 'max:365'],
            'annual_maximum' => ['required', 'integer', 'min:0', 'max:365'],
            'monthly_accrual_enabled' => ['boolean'],
            'monthly_accrual_value' => ['required', 'numeric', 'min:0', 'max:31'],
            'accrual_day_of_month' => ['required', 'integer', 'min:1', 'max:28'],
            'join_date_proration_rule' => ['required', 'in:ACCRUE_FROM_NEXT_MONTH,FULL_MONTH'],
            'carry_forward_allowed' => ['boolean'],
            'sandwich_rule_enabled' => ['boolean'],
            'is_active' => ['boolean'],
            'archived' => ['boolean'],
            'eligibility_departments' => ['nullable', 'array'],
            'eligibility_departments.*' => ['string'],
            'eligibility_designations' => ['nullable', 'array'],
            'eligibility_designations.*' => ['string'],
        ];

        // If carry forward is allowed, make related fields required
        if ($request->boolean('carry_forward_allowed')) {
            $rules['carry_forward_max_per_quarter'] = ['required', 'integer', 'min:0', 'max:31'];
            $rules['carry_forward_reset_frequency'] = ['required', 'in:QUARTERLY,ANNUAL'];
            $rules['carry_forward_auto_reset_enabled'] = ['boolean'];
            $rules['reset_notice_days'] = ['required', 'integer', 'min:0', 'max:30'];
        } else {
            // If carry forward is not allowed, make them optional
            $rules['carry_forward_max_per_quarter'] = ['nullable', 'integer', 'min:0', 'max:31'];
            $rules['carry_forward_reset_frequency'] = ['nullable', 'in:QUARTERLY,ANNUAL'];
            $rules['carry_forward_auto_reset_enabled'] = ['nullable', 'boolean'];
            $rules['reset_notice_days'] = ['nullable', 'integer', 'min:0', 'max:30'];
        }

        return $request->validate($rules);
    }

    protected function normalizeExamples(?array $examples): ?array
    {
        if (!$examples) {
            return null;
        }

        return array_values(array_filter(array_map(function ($example) {
            if (is_string($example)) {
                return trim($example);
            }
            return null;
        }, $examples)));
    }
}

