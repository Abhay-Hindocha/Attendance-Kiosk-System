<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeavePolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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

        $data['sandwich_examples'] = $this->normalizeExamples($request->input('sandwich_examples'));
        $data['eligibility_departments'] = $request->input('eligibility_departments');
        $data['eligibility_designations'] = $request->input('eligibility_designations');
        $data['eligibility_employee_ids'] = $request->input('eligibility_employee_ids');
        $data['last_updated_at'] = now();

        $policy = LeavePolicy::create($data);

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

        $data['sandwich_examples'] = $this->normalizeExamples($request->input('sandwich_examples'));
        $data['eligibility_departments'] = $request->input('eligibility_departments');
        $data['eligibility_designations'] = $request->input('eligibility_designations');
        $data['eligibility_employee_ids'] = $request->input('eligibility_employee_ids');
        $data['last_updated_at'] = now();

        $leavePolicy->update($data);

        return response()->json($leavePolicy);
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
        $leavePolicy->status = $leavePolicy->status === 'active' ? 'inactive' : 'active';
        $leavePolicy->last_updated_at = now();
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
        $duplicate->status = 'inactive';
        $duplicate->last_updated_at = now();
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

        return $request->validate([
            'name' => ['required', 'string', 'max:255', $uniqueNameRule],
            'code' => ['nullable', 'string', 'max:50', $uniqueCodeRule],
            'description' => ['nullable', 'string'],
            'yearly_quota' => ['required', 'integer', 'min:0', 'max:365'],
            'monthly_accrual' => ['required', 'numeric', 'min:0', 'max:31'],
            'accrual_day' => ['required', 'integer', 'min:1', 'max:28'],
            'join_date_proration' => ['boolean'],
            'carry_forward_enabled' => ['boolean'],
            'carry_forward_quarter_cap' => ['required', 'integer', 'min:0', 'max:31'],
            'carry_forward_reset_mode' => ['required', 'in:quarterly,annual,custom'],
            'auto_reset_quarter_end' => ['boolean'],
            'reset_notice_days' => ['required', 'integer', 'min:0', 'max:30'],
            'sandwich_rule_enabled' => ['boolean'],
            'max_balance' => ['required', 'integer', 'min:0', 'max:365'],
            'status' => ['nullable', 'in:active,inactive,archived'],
            'sandwich_examples' => ['nullable', 'array'],
            'sandwich_examples.*' => ['string'],
            'eligibility_departments' => ['nullable', 'array'],
            'eligibility_departments.*' => ['string'],
            'eligibility_designations' => ['nullable', 'array'],
            'eligibility_designations.*' => ['string'],
            'eligibility_employee_ids' => ['nullable', 'array'],
            'eligibility_employee_ids.*' => ['string'],
        ]);
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

