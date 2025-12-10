<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveRequestTimeline;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
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
                $period = CarbonPeriod::create($fromDate, $toDate);
                $totalDays = collect($period)->reduce(function ($carry, Carbon $date) {
                    if (!$date->isWeekend()) {
                        return $carry + 1;
                    }
                    return $carry;
                }, 0.0);
                $leaveRequest->from_date = $fromDate;
                $leaveRequest->to_date = $toDate;
                $leaveRequest->estimated_days = $totalDays;
                $leaveRequest->sandwich_applied_days = 0;
            }

            $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
                ->where('leave_policy_id', $leaveRequest->leave_policy_id)
                ->where('year', date('Y'))
                ->lockForUpdate()
                ->first();

            if (!$balance) {
                abort(response()->json(['error' => 'Leave balance not initialized.'], 422));
            }

            $policy = $leaveRequest->policy;

            $balance->pending_deduction = max(0, $balance->pending_deduction - $totalDays);

            $remaining = $totalDays;
            $carryUsage = min($balance->carry_forward_balance, $remaining);
            $balance->carry_forward_balance -= $carryUsage;
            $remaining -= $carryUsage;

            if ($remaining > 0) {
                if ($policy->monthly_accrual_value > 0) {
                    // For monthly accrual policies, deduct from accrued_this_year
                    $balance->accrued_this_year = max(0, $balance->accrued_this_year - $remaining);
                } else {
                    // For yearly quota policies, deduct from balance
                    $balance->balance = max(0, $balance->balance - $remaining);
                }
                $balance->used += $remaining;
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

            // Mark attendance for leave dates
            $this->markAttendanceForLeave($leaveRequest);

            // Update employee status if they were on leave
            $employee = Employee::find($leaveRequest->employee_id);
            if ($employee && $employee->status === 'on_leave') {
                $employee->update(['status' => 'active', 'leave_reason' => null]);
            }
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
            $period = CarbonPeriod::create($newFrom, $newTo);
            $newTotalDays = collect($period)->reduce(function ($carry, Carbon $date) {
                if (!$date->isWeekend()) {
                    return $carry + 1;
                }
                return $carry;
            }, 0.0);

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

    /**
     * Mark attendance records for approved leave dates
     */
    private function markAttendanceForLeave(LeaveRequest $leaveRequest)
    {
        $period = CarbonPeriod::create($leaveRequest->from_date, $leaveRequest->to_date);

        foreach ($period as $date) {
            // Skip weekends
            if ($date->isWeekend()) {
                continue;
            }

            // Skip holidays
            $isHoliday = Holiday::where('date', $date->toDateString())->exists();
            if ($isHoliday) {
                continue;
            }

            // Create or update attendance record with leave status
            Attendance::updateOrCreate(
                [
                    'employee_id' => $leaveRequest->employee_id,
                    'date' => $date->toDateString(),
                ],
                [
                    'status' => 'leave',
                    'check_in' => null,
                    'check_out' => null,
                    'scan_count' => 0,
                    'scan_times' => [],
                ]
            );
        }
    }

    /**
     * Get data needed for manual leave corrections
     */
    public function getCorrectionData()
    {
        $employees = Employee::select('id', 'name', 'department', 'status')
            ->orderBy('name')
            ->get();

        $policies = \App\Models\LeavePolicy::where('is_active', true)
            ->select('id', 'name', 'code')
            ->orderBy('name')
            ->get();

        $leaveRequests = LeaveRequest::with(['policy:id,name,code'])
            ->whereIn('status', ['pending', 'approved'])
            ->select('id', 'employee_id', 'leave_policy_id', 'from_date', 'to_date', 'reason', 'status')
            ->orderBy('from_date', 'desc')
            ->get();

        $departments = Employee::distinct()
            ->pluck('department')
            ->filter()
            ->sort()
            ->values();

        return response()->json([
            'employees' => $employees,
            'policies' => $policies,
            'leave_requests' => $leaveRequests,
            'departments' => $departments,
        ]);
    }

    /**
     * Handle manual leave corrections
     */
    public function manualCorrection(Request $request)
    {
        $data = $request->validate([
            'leave_request_id' => ['nullable', 'exists:leave_requests,id'],
            'employee_id' => ['required', 'exists:employees,id'],
            'leave_policy_id' => ['required', 'exists:leave_policies,id'],
            'action' => ['required', 'in:create,update,delete,adjust_balance'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
            'reason' => ['nullable', 'string'],
            'comment' => ['nullable', 'string'],
            'adjustment_days' => ['nullable', 'numeric'],
            'adjustment_reason' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($data, $request) {
            $action = $data['action'];

            if ($action === 'create') {
                $this->createLeaveRequest($data, $request);
            } elseif ($action === 'update') {
                $this->updateLeaveRequest($data, $request);
            } elseif ($action === 'delete') {
                $this->deleteLeaveRequest($data, $request);
            } elseif ($action === 'adjust_balance') {
                $this->adjustLeaveBalanceDirectly($data, $request);
            }
        });

        return response()->json(['message' => 'Manual correction applied successfully.']);
    }

    private function createLeaveRequest($data, $request)
    {
        $estimatedDays = $this->calculateLeaveDays($data['from_date'], $data['to_date']);

        $leaveRequest = LeaveRequest::create([
            'employee_id' => $data['employee_id'],
            'leave_policy_id' => $data['leave_policy_id'],
            'leave_type' => $data['leave_type'] ?? 'Full Day', // Use provided leave type or default
            'from_date' => $data['from_date'],
            'to_date' => $data['to_date'],
            'estimated_days' => $estimatedDays,
            'reason' => $data['reason'] ?? '',
            'status' => 'approved', // Manual corrections are auto-approved
            'approved_at' => now(),
            'is_manual_correction' => true,
        ]);

        // Update leave balance
        $this->updateLeaveBalance($leaveRequest, 'deduct');

        // Mark attendance
        $this->markAttendanceForLeave($leaveRequest);

        // Add timeline entry
        LeaveRequestTimeline::create([
            'leave_request_id' => $leaveRequest->id,
            'action' => 'manual_created',
            'notes' => $data['comment'] ?? 'Manually created leave request.',
            'performed_by_type' => 'admin',
            'performed_by_id' => optional($request->user())->id,
        ]);
    }

    private function updateLeaveRequest($data, $request)
    {
        $leaveRequest = LeaveRequest::findOrFail($data['leave_request_id']);

        $oldEstimatedDays = $leaveRequest->estimated_days + $leaveRequest->sandwich_applied_days;
        $newEstimatedDays = $this->calculateLeaveDays($data['from_date'], $data['to_date']);

        $leaveRequest->update([
            'from_date' => $data['from_date'],
            'to_date' => $data['to_date'],
            'estimated_days' => $newEstimatedDays,
            'reason' => $data['reason'] ?? $leaveRequest->reason,
            'sandwich_applied_days' => 0,
        ]);

        // Adjust balance if days changed
        if ($leaveRequest->status === 'approved' && $oldEstimatedDays !== $newEstimatedDays) {
            $difference = $newEstimatedDays - $oldEstimatedDays;
            $this->adjustLeaveBalance($leaveRequest->employee_id, $leaveRequest->leave_policy_id, $difference);
        }

        // Update attendance if dates changed
        if ($leaveRequest->status === 'approved') {
            $this->removeAttendanceForLeave($leaveRequest);
            $this->markAttendanceForLeave($leaveRequest);
        }

        LeaveRequestTimeline::create([
            'leave_request_id' => $leaveRequest->id,
            'action' => 'manual_updated',
            'notes' => $data['comment'] ?? 'Manually updated leave request.',
            'performed_by_type' => 'admin',
            'performed_by_id' => optional($request->user())->id,
        ]);
    }

    private function deleteLeaveRequest($data, $request)
    {
        $leaveRequest = LeaveRequest::findOrFail($data['leave_request_id']);

        // Restore balance if approved
        if ($leaveRequest->status === 'approved') {
            $this->updateLeaveBalance($leaveRequest, 'restore');
            $this->removeAttendanceForLeave($leaveRequest);
        }

        LeaveRequestTimeline::create([
            'leave_request_id' => $leaveRequest->id,
            'action' => 'manual_deleted',
            'notes' => $data['comment'] ?? 'Manually deleted leave request.',
            'performed_by_type' => 'admin',
            'performed_by_id' => optional($request->user())->id,
        ]);

        $leaveRequest->delete();
    }

    private function adjustLeaveBalanceDirectly($data, $request)
    {
        $this->adjustLeaveBalance($data['employee_id'], $data['leave_policy_id'], $data['adjustment_days']);

        // Log the adjustment
        \App\Models\AuditLog::create([
            'table_name' => 'leave_balances',
            'record_id' => null, // Direct adjustment, no specific record
            'action' => 'manual_adjustment',
            'old_values' => null,
            'new_values' => [
                'employee_id' => $data['employee_id'],
                'leave_policy_id' => $data['leave_policy_id'],
                'adjustment' => $data['adjustment_days'],
            ],
            'user_id' => optional($request->user())->id,
            'reason' => $data['adjustment_reason'] ?? $data['comment'],
        ]);
    }

    private function calculateLeaveDays($fromDate, $toDate)
    {
        $from = Carbon::parse($fromDate);
        $to = Carbon::parse($toDate);
        $period = CarbonPeriod::create($from, $to);

        $days = 0;
        foreach ($period as $date) {
            if (!$date->isWeekend()) {
                $isHoliday = Holiday::where('date', $date->toDateString())->exists();
                if (!$isHoliday) {
                    $days += 1;
                }
            }
        }

        return $days;
    }

    private function updateLeaveBalance(LeaveRequest $leaveRequest, $action = 'deduct')
    {
        $totalDays = $leaveRequest->estimated_days + $leaveRequest->sandwich_applied_days;
        $this->adjustLeaveBalance($leaveRequest->employee_id, $leaveRequest->leave_policy_id, $action === 'deduct' ? -$totalDays : $totalDays);
    }

    private function adjustLeaveBalance($employeeId, $policyId, $days)
    {
        $balance = LeaveBalance::where('employee_id', $employeeId)
            ->where('leave_policy_id', $policyId)
            ->where('year', date('Y'))
            ->lockForUpdate()
            ->first();

        if (!$balance) {
            return; // Balance not initialized
        }

        $remaining = abs($days);
        $isDeduction = $days < 0;

        if ($isDeduction) {
            // Deduct from carry forward first
            $carryUsage = min($balance->carry_forward_balance, $remaining);
            $balance->carry_forward_balance -= $carryUsage;
            $remaining -= $carryUsage;

            if ($remaining > 0) {
                $policy = \App\Models\LeavePolicy::find($policyId);
                if ($policy && $policy->monthly_accrual_value > 0) {
                    $balance->accrued_this_year = max(0, $balance->accrued_this_year - $remaining);
                } else {
                    $balance->balance = max(0, $balance->balance - $remaining);
                }
                $balance->used += $remaining;
            }
        } else {
            // Addition - add to balance
            $policy = \App\Models\LeavePolicy::find($policyId);
            if ($policy && $policy->monthly_accrual_value > 0) {
                $balance->accrued_this_year += $remaining;
            } else {
                $balance->balance += $remaining;
            }
        }

        $balance->save();
    }

    private function removeAttendanceForLeave(LeaveRequest $leaveRequest)
    {
        $period = CarbonPeriod::create($leaveRequest->from_date, $leaveRequest->to_date);

        foreach ($period as $date) {
            Attendance::where('employee_id', $leaveRequest->employee_id)
                ->where('date', $date->toDateString())
                ->where('status', 'leave')
                ->delete();
        }
    }
}

