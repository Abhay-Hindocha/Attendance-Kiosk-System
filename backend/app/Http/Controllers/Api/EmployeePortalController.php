<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Services\AttendanceLogic;
use App\Services\LeaveService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;

class EmployeePortalController extends Controller
{
    public function dashboard(Request $request)
    {
        $employee = $request->user();
        $today = Carbon::today();

        $todayAttendance = Attendance::where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->first();

        $lastAttendances = Attendance::where('employee_id', $employee->id)
            ->orderByDesc('date')
            ->limit(10) // get more to have enough activities
            ->get(['id', 'date', 'check_in', 'check_out', 'status']);

        $lastActivities = [];
        foreach ($lastAttendances as $attendance) {
            if ($attendance->check_in) {
                $lastActivities[] = [
                    'id' => $attendance->id . '_in',
                    'date' => $attendance->date,
                    'time' => $attendance->check_in,
                    'action' => 'Check-In',
                    'status' => $attendance->status,
                ];
            }
            if ($attendance->check_out) {
                $lastActivities[] = [
                    'id' => $attendance->id . '_out',
                    'date' => $attendance->date,
                    'time' => $attendance->check_out,
                    'action' => 'Check-Out',
                    'status' => $attendance->status,
                ];
            }
        }

        // Sort by time desc and limit to 5
        usort($lastActivities, function ($a, $b) {
            return strtotime($b['time']) - strtotime($a['time']);
        });
        $lastActivities = array_slice($lastActivities, 0, 5);

        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        $weeklyAttendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$weekStart, $weekEnd])
            ->get();

        $attendanceLogic = new AttendanceLogic();
        $weeklyHours = $weeklyAttendances->sum(function (Attendance $attendance) use ($employee, $attendanceLogic) {
            if (!$attendance->check_in) {
                return 0;
            }

            if (!$attendance->check_out) {
                if ($attendance->date->isToday()) {
                    // For today, use current time as check-out for calculation
                    $attendance->check_out = now();
                } else {
                    return 0; // not checked out and not today, assume 0
                }
            }

            $minutesWorked = $attendanceLogic->calculateWorkMinutes($attendance, $employee->policy);
            return $minutesWorked / 60;
        });

        $pendingLeaves = LeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'clarification'])
            ->orderByDesc('created_at')
            ->get(['id', 'from_date', 'to_date', 'status', 'reason']);

        return response()->json([
            'today' => [
                'date' => $today->toDateString(),
                'status' => $todayAttendance->status ?? 'absent',
                'check_in' => optional($todayAttendance?->check_in)?->toDateTimeString(),
                'check_out' => optional($todayAttendance?->check_out)?->toDateTimeString(),
            ],
            'last_check_ins' => $lastActivities,
            'weekly_hours' => round(max(0, $weeklyHours), 2),
            'pending_leaves' => $pendingLeaves,
            'quick_actions' => [
                ['label' => 'Leave Dashboard', 'path' => '/employee/leaves'],
                ['label' => 'View Attendance', 'path' => '/employee/attendance'],
                ['label' => 'My Profile', 'path' => '/employee/profile'],
            ],
        ]);
    }

    public function leaveBalances(Request $request)
    {
        $employee = $request->user();

        $policies = $employee->leavePolicies;

        $balances = [];
        foreach ($policies as $policy) {
            $balanceRecord = LeaveBalance::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->first();

            // Create balance record if it doesn't exist
            if (!$balanceRecord) {
                $leaveService = new LeaveService();
                $initialBalance = $leaveService->calculateProratedBalance($policy, $employee->join_date ?? now());

                $balanceRecord = LeaveBalance::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'year' => date('Y'),
                    'balance' => $initialBalance,
                    'carry_forward_balance' => 0,
                    'pending_deduction' => 0,
                    'accrued_this_year' => 0,
                ]);
            }

            $balances[] = [
                'id' => $balanceRecord->id,
                'policy' => $policy,
                'balance' => $balanceRecord->balance,
                'carry_forward_balance' => $balanceRecord->carry_forward_balance,
                'pending_deduction' => $balanceRecord->pending_deduction,
                'accrued_this_year' => $balanceRecord->accrued_this_year,
            ];
        }

        // Update pending deductions
        $leaveService = new LeaveService();
        $leaveService->updatePendingDeductions($employee->id);

        // Refresh pending deductions after updating
        foreach ($balances as &$bal) {
            if ($bal['id']) {
                $updated = LeaveBalance::find($bal['id']);
                $bal['pending_deduction'] = $updated->pending_deduction;
            }
        }

        $pending = LeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'clarification'])
            ->get();

        $approved = LeaveRequest::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->orderByDesc('approved_at')
            ->limit(10)
            ->get();

        $history = LeaveRequest::where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'balances' => $balances,
            'pending_requests' => $pending,
            'approved_leaves' => $approved,
            'history' => $history,
        ]);
    }

    public function attendanceReport(Request $request)
    {
        $employee = $request->user();

        $start = Carbon::parse($request->input('start_date', Carbon::now()->startOfMonth()));
        $end = Carbon::parse($request->input('end_date', Carbon::now()->endOfMonth()));

        $records = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])
            ->orderBy('date')
            ->get();

        $summary = [
            'total_days' => CarbonPeriod::create($start, $end)->count(),
            'present' => $records->where('status', 'present')->count(),
            'absent' => $records->where('status', 'absent')->count(),
            'late' => $records->where('status', 'late')->count(),
        ];

        return response()->json([
            'range' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
            'summary' => $summary,
            'records' => $records,
        ]);
    }
}

