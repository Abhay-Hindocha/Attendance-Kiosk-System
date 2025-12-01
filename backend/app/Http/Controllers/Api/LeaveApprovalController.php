<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveRequestTimeline;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaveApprovalController extends Controller
{
    public function index(Request $request)
    {
        $query = LeaveRequest::with(['employee:id,name,department', 'policy:id,name,code'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('department'), function ($q) use ($request) {
                $q->whereHas('employee', fn ($emp) => $emp->where('department', $request->string('department')));
            })
            ->when($request->filled('leave_policy_id'), fn ($q) => $q->where('leave_policy_id', $request->integer('leave_policy_id')))
            ->when($request->filled('date_range'), function ($q) use ($request) {
                [$start, $end] = explode(',', $request->string('date_range'));
                $q->whereBetween('from_date', [$start, $end]);
            })
            ->orderBy('from_date');

        return response()->json($query->paginate(25));
    }

    public function approve(Request $request, LeaveRequest $leaveRequest)
    {
        if (!in_array($leaveRequest->status, ['pending', 'clarification'])) {
            return response()->json(['error' => 'Only pending or clarification requests can be approved.'], 422);
        }

        $data = $request->validate([
            'comment' => ['nullable', 'string'],
            'from_date' => ['nullable', 'date', 'before_or_equal:to_date'],
            'to_date' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($leaveRequest, $data, $request) {
            $totalDays = $leaveRequest->estimated_days + $leaveRequest->sandwich_applied_days;

            if (!empty($data['from_date']) && !empty($data['to_date'])) {
                $fromDate = Carbon::parse($data['from_date']);
                $toDate = Carbon::parse($data['to_date']);
                $totalDays = $toDate->diffInDays($fromDate) + 1;
                $leaveRequest->from_date = $fromDate;
                $leaveRequest->to_date = $toDate;
                $leaveRequest->estimated_days = $totalDays;
                $leaveRequest->sandwich_applied_days = 0;
            }

            $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
                ->where('leave_policy_id', $leaveRequest->leave_policy_id)
                ->lockForUpdate()
                ->first();

            if (!$balance) {
                abort(response()->json(['error' => 'Leave balance not initialized.'], 422));
            }

            $balance->pending_deduction = max(0, $balance->pending_deduction - $totalDays);

            $remaining = $totalDays;
            $carryUsage = min($balance->carry_forward_balance, $remaining);
            $balance->carry_forward_balance -= $carryUsage;
            $remaining -= $carryUsage;

            if ($remaining > 0) {
                $balance->balance = max(0, $balance->balance - $remaining);
            }

            $balance->save();

            $leaveRequest->status = 'approved';
            $leaveRequest->approved_at = now();
            $leaveRequest->save();

            LeaveRequestTimeline::create([
                'leave_request_id' => $leaveRequest->id,
                'action' => 'approved',
                'notes' => $data['comment'] ?? 'Leave approved.',
                'performed_by_type' => 'admin',
                'performed_by_id' => optional($request->user())->id,
            ]);
        });

        return response()->json(['message' => 'Leave request approved successfully.']);
    }

    public function reject(Request $request, LeaveRequest $leaveRequest)
    {
        if ($leaveRequest->status !== 'pending') {
            return response()->json(['error' => 'Only pending requests can be rejected.'], 422);
        }

        $data = $request->validate([
            'comment' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($leaveRequest, $data, $request) {
            $totalDays = $leaveRequest->estimated_days + $leaveRequest->sandwich_applied_days;
            $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
                ->where('leave_policy_id', $leaveRequest->leave_policy_id)
                ->lockForUpdate()
                ->first();

            if ($balance) {
                $balance->pending_deduction = max(0, $balance->pending_deduction - $totalDays);
                $balance->save();
            }

            $leaveRequest->status = 'rejected';
            $leaveRequest->rejected_at = now();
            $leaveRequest->save();

            LeaveRequestTimeline::create([
                'leave_request_id' => $leaveRequest->id,
                'action' => 'rejected',
                'notes' => $data['comment'] ?? 'Leave rejected.',
                'performed_by_type' => 'admin',
                'performed_by_id' => optional($request->user())->id,
            ]);
        });

        return response()->json(['message' => 'Leave request rejected successfully.']);
    }

    public function requestClarification(Request $request, LeaveRequest $leaveRequest)
    {
        if (!in_array($leaveRequest->status, ['pending', 'clarification'])) {
            return response()->json(['error' => 'Clarification can only be requested for pending requests.'], 422);
        }

        $data = $request->validate([
            'comment' => ['required', 'string'],
        ]);

        $leaveRequest->status = 'clarification';
        $leaveRequest->clarification_requested_at = now();
        $leaveRequest->save();

        LeaveRequestTimeline::create([
            'leave_request_id' => $leaveRequest->id,
            'action' => 'clarification_requested',
            'notes' => $data['comment'],
            'performed_by_type' => 'admin',
            'performed_by_id' => optional($request->user())->id,
        ]);

        return response()->json(['message' => 'Clarification requested from employee.']);
    }

    public function overwriteDates(Request $request, LeaveRequest $leaveRequest)
    {
        $data = $request->validate([
            'from_date' => ['required', 'date', 'before_or_equal:to_date'],
            'to_date' => ['required', 'date'],
            'comment' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($leaveRequest, $data, $request) {
            $totalDaysOld = $leaveRequest->estimated_days + $leaveRequest->sandwich_applied_days;
            $newFrom = Carbon::parse($data['from_date']);
            $newTo = Carbon::parse($data['to_date']);
            $newTotalDays = $newTo->diffInDays($newFrom) + 1;

            $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
                ->where('leave_policy_id', $leaveRequest->leave_policy_id)
                ->lockForUpdate()
                ->first();

            if ($balance) {
                $balance->pending_deduction = max(0, $balance->pending_deduction - $totalDaysOld + $newTotalDays);
                $balance->save();
            }

            $leaveRequest->from_date = $newFrom;
            $leaveRequest->to_date = $newTo;
            $leaveRequest->estimated_days = $newTotalDays;
            $leaveRequest->sandwich_applied_days = 0;
            $leaveRequest->save();

            LeaveRequestTimeline::create([
                'leave_request_id' => $leaveRequest->id,
                'action' => 'dates_overwritten',
                'notes' => $data['comment'] ?? 'Leave dates adjusted by admin.',
                'performed_by_type' => 'admin',
                'performed_by_id' => optional($request->user())->id,
            ]);
        });

        return response()->json(['message' => 'Leave request dates updated.']);
    }
}

