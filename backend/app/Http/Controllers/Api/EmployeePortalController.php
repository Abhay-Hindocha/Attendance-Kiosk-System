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
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Mail\AttendanceCorrectionRequestSubmittedMail;
use App\Models\Admin;

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
            ->with('breaks')
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

            // Add break activities
            foreach ($attendance->breaks as $break) {
                if ($break->break_start) {
                    $lastActivities[] = [
                        'id' => $break->id . '_break_start',
                        'date' => $attendance->date,
                        'time' => $break->break_start,
                        'action' => 'Break Start',
                        'status' => $attendance->status,
                    ];
                }
                if ($break->break_end) {
                    $lastActivities[] = [
                        'id' => $break->id . '_break_end',
                        'date' => $attendance->date,
                        'time' => $break->break_end,
                        'action' => 'Break End',
                        'status' => $attendance->status,
                    ];
                }
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

        // Leave balances
        $policies = $employee->leavePolicies;
        $leaveBalancesArray = [];
        foreach ($policies as $policy) {
            $balanceRecord = LeaveBalance::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
                ->where('year', date('Y'))
                ->first();

            // Create balance record if it doesn't exist
            if (!$balanceRecord) {
                $leaveService = new LeaveService();
                $initialBalance = $leaveService->calculateProratedBalance($policy, $employee->join_date ?? now());

                // For monthly accrual policies, start with 0 balance and accrue monthly
                if ($policy->monthly_accrual_value > 0) {
                    $openingBalance = 0;
                    $accrued = 0;
                    $balanceValue = 0;
                    $accruedThisYear = 0;
                } else {
                    // For non-monthly policies, set balance to full yearly quota
                    $openingBalance = $policy->yearly_quota;
                    $accrued = 0;
                    $balanceValue = $policy->yearly_quota;
                    $accruedThisYear = 0;
                }

                $balanceRecord = LeaveBalance::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'year' => date('Y'),
                    'balance' => $balanceValue,
                    'opening_balance' => $openingBalance,
                    'carry_forward_balance' => 0,
                    'pending_deduction' => 0,
                    'accrued_this_year' => $accruedThisYear,
                    'accrued' => $accrued,
                    'used' => 0,
                    'carried_forward' => 0,
                    'sandwich_days_charged' => 0,
                ]);
            }

            // For monthly accrual policies, total is accrued this year plus carry forward
            // For non-monthly policies, total is yearly quota plus carry forward
            if ($policy->monthly_accrual_value > 0) {
                $total = $balanceRecord->accrued_this_year + $balanceRecord->carry_forward_balance;
            } else {
                $total = $policy->yearly_quota + $balanceRecord->carry_forward_balance;
            }
            $available = $total - $balanceRecord->used - $balanceRecord->pending_deduction - $balanceRecord->sandwich_days_charged;

            $leaveBalancesArray[] = [
                'id' => $policy->id,
                'name' => $policy->name,
                'code' => $policy->code,
                'description' => $policy->description,
                'available' => max(0, $available),
                'total' => $total,
                'balance' => $balanceRecord->balance,
                'carry_forward_balance' => $balanceRecord->carry_forward_balance,
                'pending_deduction' => $balanceRecord->pending_deduction,
                'accrued_this_year' => $balanceRecord->accrued_this_year,
                'is_monthly_accrual' => $policy->monthly_accrual_value > 0,
            ];
        }

        // Update pending deductions
        $leaveService = new LeaveService();
        $leaveService->updatePendingDeductions($employee->id);

        // Refresh pending deductions after updating
        foreach ($leaveBalancesArray as &$bal) {
            if ($bal['id']) {
                $updated = LeaveBalance::where('employee_id', $employee->id)
                    ->where('leave_policy_id', $bal['id'])
                    ->where('year', date('Y'))
                    ->first();
                if ($updated) {
                    $bal['pending_deduction'] = $updated->pending_deduction;
                    $bal['available'] = max(0, $bal['total'] - $updated->used - $updated->pending_deduction - $updated->sandwich_days_charged);
                }
            }
        }

        // Pending requests
        $pendingRequests = LeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'clarification'])
            ->with('policy')
            ->orderByDesc('created_at')
            ->get(['id', 'from_date', 'to_date', 'status', 'reason', 'leave_type', 'total_days', 'leave_policy_id', 'created_at']);

        $pendingRequestsFormatted = $pendingRequests->map(function ($request) {
            return [
                'id' => $request->id,
                'type' => $request->leave_type ?? 'Leave',
                'policy_name' => $request->policy->name ?? 'Leave',
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'days' => $request->total_days ?? 1,
                'reason' => $request->reason,
                'submitted_at' => $request->created_at->toDateString(),
            ];
        });

        // Recent requests
        $recentRequests = LeaveRequest::where('employee_id', $employee->id)
            ->with([
                'timelines' => function ($query) {
                    $query->where('action', 'clarification_requested')->orderByDesc('created_at')->limit(1);
                }
            ])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'from_date', 'to_date', 'status', 'reason', 'leave_type', 'total_days', 'created_at']);

        $recentRequestsFormatted = $recentRequests->map(function ($request) {
            $clarificationReason = null;
            if ($request->status === 'clarification') {
                $timeline = $request->timelines->first();
                $clarificationReason = $timeline ? $timeline->notes : null;
            }
            return [
                'id' => $request->id,
                'type' => $request->leave_type ?? 'Leave',
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'days' => $request->total_days ?? 1,
                'status' => ucfirst($request->status),
                'reason' => $request->reason,
                'clarification_reason' => $clarificationReason,
                'submitted_at' => $request->created_at->toDateString(),
            ];
        });

        // Stats
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        $approvedThisMonth = LeaveRequest::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereYear('approved_at', $currentYear)
            ->whereMonth('approved_at', $currentMonth)
            ->sum('total_days');

        $totalLeavesTaken = LeaveRequest::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereYear('approved_at', $currentYear)
            ->sum('total_days');

        return response()->json([
            'today' => [
                'date' => $today->toDateString(),
                'status' => $todayAttendance->status ?? 'absent',
                'check_in' => optional($todayAttendance?->check_in)?->toDateTimeString(),
                'check_out' => optional($todayAttendance?->check_out)?->toDateTimeString(),
            ],
            'last_check_ins' => $lastActivities,
            'weekly_hours' => round(max(0, $weeklyHours), 2),
            'leave_balances' => $leaveBalancesArray,
            'pending_leaves' => $pendingRequestsFormatted,
            'recent_leaves' => $recentRequestsFormatted,
            'pending_requests_count' => $pendingRequests->count(),
            'approved_this_month' => (float) $approvedThisMonth,
            'total_leaves_taken' => (float) $totalLeavesTaken,
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
                ->where('year', date('Y'))
                ->first();

            // Create balance record if it doesn't exist
            if (!$balanceRecord) {
                $leaveService = new LeaveService();
                $initialBalance = $leaveService->calculateProratedBalance($policy, $employee->join_date ?? now());

                // For monthly accrual policies, start with 0 balance and accrue monthly
                if ($policy->monthly_accrual_value > 0) {
                    $balanceValue = 0;
                } else {
                    // For non-monthly policies, set balance to full yearly quota
                    $balanceValue = $policy->yearly_quota;
                }

                $balanceRecord = LeaveBalance::create([
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                    'year' => date('Y'),
                    'balance' => $balanceValue,
                    'opening_balance' => $balanceValue,
                    'carry_forward_balance' => 0,
                    'pending_deduction' => 0,
                    'accrued_this_year' => 0,
                    'accrued' => 0,
                    'used' => 0,
                    'carried_forward' => 0,
                    'sandwich_days_charged' => 0,
                ]);
            }

            // Calculate total and available balance consistently with dashboard
            if ($policy->monthly_accrual_value > 0) {
                $total = $balanceRecord->accrued_this_year + $balanceRecord->carry_forward_balance;
            } else {
                $total = $policy->yearly_quota + $balanceRecord->carry_forward_balance;
            }
            $available = max(0, $total - $balanceRecord->used - $balanceRecord->pending_deduction - $balanceRecord->sandwich_days_charged);

            $balances[] = [
                'id' => $balanceRecord->id,
                'policy' => $policy,
                'balance' => $available, // Use calculated available balance for consistency with dashboard
                'total' => $total,
                'available' => $available,
                'carry_forward_balance' => $balanceRecord->carry_forward_balance,
                'pending_deduction' => $balanceRecord->pending_deduction,
                'accrued_this_year' => $balanceRecord->accrued_this_year,
                'is_monthly_accrual' => $policy->monthly_accrual_value > 0,
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
                $bal['available'] = max(0, $bal['total'] - $updated->used - $updated->pending_deduction - $updated->sandwich_days_charged);
                $bal['balance'] = $bal['available']; // Use the calculated available balance for consistency
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

        $attendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])
            ->with('employee.policy', 'breaks')
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->date)->toDateString();
            });

        $holidays = \App\Models\Holiday::whereBetween('date', [$start, $end])
            ->get()
            ->keyBy('date');

        // Fetch leave requests
        $leaveRequests = LeaveRequest::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('from_date', [$start, $end])
                    ->orWhereBetween('to_date', [$start, $end])
                    ->orWhere(function ($q) use ($start, $end) {
                        $q->where('from_date', '<=', $start)
                            ->where('to_date', '>=', $end);
                    });
            })
            ->get()
            ->keyBy('from_date');

        $result = [];
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $dateKey = $date->toDateString();
            $attendance = $attendances->get($dateKey);
            $holiday = $holidays->get($dateKey);
            $leave = $leaveRequests->get($dateKey);

            if ($attendance) {
                $checkIn = $attendance->check_in ? $attendance->check_in->toISOString() : null;
                $checkOut = $attendance->check_out ? $attendance->check_out->toISOString() : null;

                // Calculate total work minutes and format using AttendanceLogic
                $totalMinutesWorked = null;
                $totalHours = null;

                if ($attendance->check_in && $attendance->check_out) {
                    $totalMinutesWorked = (new AttendanceLogic())->calculateWorkMinutes($attendance, $employee->policy);
                    $totalHours = (new AttendanceLogic())->formatWorkDuration($totalMinutesWorked);
                }

                // Use AttendanceLogic to calculate the correct status
                $status = (new AttendanceLogic())->calculateStatus($employee, $attendance);

                // Update the database record if status changed
                if ($status !== $attendance->status) {
                    $attendance->update(['status' => $status]);
                }

                // Map database status to display strings
                $displayStatusMap = [
                    'late' => 'Late Arrival',
                    'present' => 'Present',
                    'absent' => 'Absent',
                    'half_day' => 'Half Day',
                    'early_departure' => 'Early Departure',
                    'leave' => 'On Leave',
                ];
                $displayStatus = $displayStatusMap[$status] ?? ucfirst($status);

                $result[] = [
                    'id' => $attendance->id,
                    'date' => $dateKey,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'total_hours' => $totalHours,
                    'breaks' => $attendance->breaks->map(function ($break) {
                        return [
                            'break_start' => $break->break_start ? $break->break_start->toISOString() : null,
                            'break_end' => $break->break_end ? $break->break_end->toISOString() : null,
                        ];
                    })->toArray(),
                    'status' => $displayStatus,
                    'holiday' => $holiday ? ['name' => $holiday->name, 'description' => $holiday->description] : null
                ];
            } elseif ($holiday) {
                $result[] = [
                    'date' => $dateKey,
                    'check_in' => null,
                    'check_out' => null,
                    'total_hours' => null,
                    'breaks' => [],
                    'status' => 'Holiday',
                    'holiday' => ['name' => $holiday->name, 'description' => $holiday->description]
                ];
            } elseif ($leave) {
                $result[] = [
                    'date' => $dateKey,
                    'check_in' => null,
                    'check_out' => null,
                    'total_hours' => null,
                    'breaks' => [],
                    'status' => 'On Leave',
                    'leave_reason' => $leave->reason ?? 'Leave',
                    'holiday' => null
                ];
            } else {
                // No attendance and no holiday - only include if it's past (till one day behind), and not a weekend
                $yesterday = Carbon::yesterday()->toDateString();
                if ($dateKey <= $yesterday && !$date->isWeekend()) {
                    $result[] = [
                        'date' => $dateKey,
                        'check_in' => null,
                        'check_out' => null,
                        'total_hours' => null,
                        'breaks' => [],
                        'status' => 'Absent',
                        'holiday' => null
                    ];
                }
            }
        }

        $summary = [
            'total_days' => $start->diffInDays($end) + 1,
            'present' => collect($result)->where('status', 'Present')->count(),
            'absent' => collect($result)->where('status', 'Absent')->count(),
            'late' => collect($result)->where('status', 'Late Arrival')->count(),
        ];

        return response()->json([
            'range' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
            'summary' => $summary,
            'records' => $result,
        ]);
    }

    public function exportAttendanceReport(Request $request)
    {
        $employee = $request->user();

        $start = Carbon::parse($request->input('start_date', Carbon::now()->startOfMonth()));
        $end = Carbon::parse($request->input('end_date', Carbon::now()->endOfMonth()));

        $attendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])
            ->with('employee.policy', 'breaks')
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->date)->toDateString();
            });

        $holidays = \App\Models\Holiday::whereBetween('date', [$start, $end])
            ->get()
            ->keyBy('date');

        // Fetch leave requests
        $leaveRequests = LeaveRequest::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('from_date', [$start, $end])
                    ->orWhereBetween('to_date', [$start, $end])
                    ->orWhere(function ($q) use ($start, $end) {
                        $q->where('from_date', '<=', $start)
                            ->where('to_date', '>=', $end);
                    });
            })
            ->get()
            ->keyBy('from_date');

        $result = [];
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $dateKey = $date->toDateString();
            $attendance = $attendances->get($dateKey);
            $holiday = $holidays->get($dateKey);
            $leave = $leaveRequests->get($dateKey);

            if ($attendance) {
                $checkIn = $attendance->check_in ? $attendance->check_in->toISOString() : null;
                $checkOut = $attendance->check_out ? $attendance->check_out->toISOString() : null;

                // Calculate total work minutes and format using AttendanceLogic
                $totalMinutesWorked = null;
                $totalHours = null;

                if ($attendance->check_in && $attendance->check_out) {
                    $totalMinutesWorked = (new AttendanceLogic())->calculateWorkMinutes($attendance, $employee->policy);
                    $totalHours = (new AttendanceLogic())->formatWorkDuration($totalMinutesWorked);
                }

                // Use AttendanceLogic to calculate the correct status
                $status = (new AttendanceLogic())->calculateStatus($employee, $attendance);

                // Update the database record if status changed
                if ($status !== $attendance->status) {
                    $attendance->update(['status' => $status]);
                }

                // Map database status to display strings
                $displayStatusMap = [
                    'late' => 'Late Arrival',
                    'present' => 'Present',
                    'absent' => 'Absent',
                    'half_day' => 'Half Day',
                    'early_departure' => 'Early Departure',
                    'leave' => 'On Leave',
                ];
                $displayStatus = $displayStatusMap[$status] ?? ucfirst($status);

                $result[] = [
                    'date' => $dateKey,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'total_hours' => $totalHours,
                    'breaks' => $attendance->breaks->map(function ($break) {
                        return [
                            'break_start' => $break->break_start ? $break->break_start->toISOString() : null,
                            'break_end' => $break->break_end ? $break->break_end->toISOString() : null,
                        ];
                    })->toArray(),
                    'status' => $displayStatus,
                    'holiday' => $holiday ? ['name' => $holiday->name, 'description' => $holiday->description] : null
                ];
            } elseif ($holiday) {
                $result[] = [
                    'date' => $dateKey,
                    'check_in' => null,
                    'check_out' => null,
                    'total_hours' => null,
                    'breaks' => [],
                    'status' => 'Holiday',
                    'holiday' => ['name' => $holiday->name, 'description' => $holiday->description]
                ];
            } elseif ($leave) {
                $result[] = [
                    'date' => $dateKey,
                    'check_in' => null,
                    'check_out' => null,
                    'total_hours' => null,
                    'breaks' => [],
                    'status' => 'On Leave',
                    'leave_reason' => $leave->reason ?? 'Leave',
                    'holiday' => null
                ];
            } else {
                // No attendance and no holiday - only include if it's past (till one day behind), and not a weekend
                $yesterday = Carbon::yesterday()->toDateString();
                if ($dateKey <= $yesterday && !$date->isWeekend()) {
                    $result[] = [
                        'date' => $dateKey,
                        'check_in' => null,
                        'check_out' => null,
                        'total_hours' => null,
                        'breaks' => [],
                        'status' => 'Absent',
                        'holiday' => null
                    ];
                }
            }
        }

        $filename = "attendance-{$employee->name}-{$start->format('Y-m')}.csv";

        $headers = [
            "Content-type" => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $columns = ['Date', 'Check In', 'Check Out', 'Total Hours', 'Breaks', 'Break Details', 'Status'];

        $callback = function () use ($result, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($result as $record) {
                $breaksText = '';
                $breakDetails = '';
                if (is_array($record['breaks']) && count($record['breaks']) > 0) {
                    $breaksText = count($record['breaks']) . ' times';
                    $breakDetailsArray = [];
                    foreach ($record['breaks'] as $index => $break) {
                        $start = $break['break_start'] ? Carbon::parse($break['break_start'])->setTimezone(config('app.timezone'))->format('H:i') : '-';
                        $end = $break['break_end'] ? Carbon::parse($break['break_end'])->setTimezone(config('app.timezone'))->format('H:i') : '-';
                        $breakDetailsArray[] = "Break " . ($index + 1) . ": {$start}-{$end}";
                    }
                    $breakDetails = implode(', ', $breakDetailsArray);
                } elseif (is_numeric($record['breaks'])) {
                    $breaksText = $record['breaks'] . ' times';
                    $breakDetails = '-';
                } else {
                    $breaksText = '-';
                    $breakDetails = '-';
                }
                fputcsv($file, [
                    $record['date'],
                    $record['check_in'] ? Carbon::parse($record['check_in'])->setTimezone(config('app.timezone'))->format('H:i') : '-',
                    $record['check_out'] ? Carbon::parse($record['check_out'])->setTimezone(config('app.timezone'))->format('H:i') : '-',
                    $record['total_hours'] ?? '-',
                    $breaksText,
                    $breakDetails,
                    $record['status']
                ]);
            }

            fclose($file);
        };

        return new StreamedResponse($callback, 200, $headers);
    }

    public function holidays(Request $request)
    {
        $year = $request->input('year', date('Y'));

        $holidays = \App\Models\Holiday::whereYear('date', $year)
            ->get(['id', 'name', 'date', 'description'])
            ->map(function ($holiday) {
                return [
                    'id' => $holiday->id,
                    'name' => $holiday->name,
                    'date' => Carbon::parse($holiday->date)->toDateString(),
                    'description' => $holiday->description,
                ];
            });

        return response()->json([
            'year' => $year,
            'holidays' => $holidays,
        ]);
    }

    public function getProfile(Request $request)
    {
        $employee = $request->user()->load('policy');

        $leavePolicies = $employee->leavePolicies->map(function ($policy) {
            return [
                'id' => $policy->id,
                'name' => $policy->name,
                'yearly_quota' => $policy->yearly_quota,
            ];
        });

        $attendancePolicy = $employee->policy;

        return response()->json([
            'id' => $employee->id,
            'employee_id' => $employee->employee_id,
            'name' => $employee->name,
            'email' => $employee->email,
            'phone' => $employee->phone,
            'emergency_contact_number' => $employee->emergency_contact_number,
            'profile_photo' => $employee->profile_photo,
            'department' => $employee->department,
            'designation' => $employee->designation,
            'join_date' => $employee->join_date,
            'status' => $employee->status,
            'leave_policies' => $leavePolicies,
            'attendance_policy' => $attendancePolicy ? [
                'id' => $attendancePolicy->id,
                'name' => $attendancePolicy->name,
                'work_start_time' => $attendancePolicy->work_start_time,
                'work_end_time' => $attendancePolicy->work_end_time,
                'break_duration' => ($attendancePolicy->break_hours * 60) + $attendancePolicy->break_minutes,
                'grace_period' => $attendancePolicy->late_grace_period,
            ] : null,
            'avatar' => $employee->avatar ?: $this->generateAvatar($employee->name),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $employee = $request->user();

        $data = $request->validate([
            'phone' => 'nullable|string|max:20',
            'emergency_contact_number' => 'nullable|string|max:20',
        ]);

        // Handle profile photo separately
        if ($request->hasFile('profile_photo')) {
            \Log::info('Profile photo file detected', [
                'has_file' => $request->hasFile('profile_photo'),
                'file_size' => $request->file('profile_photo')->getSize(),
                'file_name' => $request->file('profile_photo')->getClientOriginalName(),
            ]);

            $validated = $request->validate([
                'profile_photo' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
            ]);

            \Log::info('File validation passed');

            // Delete old photo if exists
            if ($employee->profile_photo) {
                \Log::info('Deleting old photo: ' . $employee->profile_photo);
                \Storage::disk('public')->delete($employee->profile_photo);
            }

            $path = $request->file('profile_photo')->store('profile_photos', 'public');
            \Log::info('File stored at: ' . $path);
            $data['profile_photo'] = $path;
        } else {
            \Log::info('No profile photo file in request');
        }

        \Log::info('Updating employee with data:', $data);
        $employee->update($data);
        $employee->refresh();

        // Get leave policies
        $leavePolicies = $employee->leavePolicies->map(function ($policy) {
            return [
                'id' => $policy->id,
                'name' => $policy->name,
                'yearly_quota' => $policy->yearly_quota,
            ];
        });

        $attendancePolicy = $employee->policy;

        return response()->json([
            'message' => 'Profile updated successfully',
            'employee' => [
                'employee_id' => $employee->employee_id,
                'name' => $employee->name,
                'email' => $employee->email,
                'phone' => $employee->phone,
                'emergency_contact_number' => $employee->emergency_contact_number,
                'profile_photo' => $employee->profile_photo,
                'department' => $employee->department,
                'designation' => $employee->designation,
                'join_date' => $employee->join_date,
                'status' => $employee->status,
                'leave_policies' => $leavePolicies,
                'attendance_policy' => $attendancePolicy ? [
                    'id' => $attendancePolicy->id,
                    'name' => $attendancePolicy->name,
                    'work_start_time' => $attendancePolicy->work_start_time,
                    'work_end_time' => $attendancePolicy->work_end_time,
                    'break_duration' => ($attendancePolicy->break_hours * 60) + $attendancePolicy->break_minutes,
                    'grace_period' => $attendancePolicy->late_grace_period,
                ] : null,
                'avatar' => $employee->avatar ?: $this->generateAvatar($employee->name),
            ],
        ]);
    }

    public function changePassword(Request $request)
    {
        $employee = $request->user();

        try {
            $data = $request->validate([
                'current_password' => 'required|string',
                'password' => 'required|string|min:6|confirmed',
            ]);

            if (!$employee->password || !Hash::check($data['current_password'], $employee->password)) {
                return response()->json(['message' => 'Current password is incorrect'], 400);
            }

            $employee->password = Hash::make($data['password']);
            $employee->save();

            return response()->json(['message' => 'Password changed successfully']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'An error occurred while changing password'], 500);
        }
    }

    public function respondToClarification(Request $request, LeaveRequest $leaveRequest)
    {
        $employee = $request->user();

        if ($leaveRequest->employee_id !== $employee->id) {
            return response()->json(['error' => 'You can only respond to your own leave requests.'], 403);
        }

        if ($leaveRequest->status !== 'clarification') {
            return response()->json(['error' => 'This request is not in clarification status.'], 422);
        }

        $data = $request->validate([
            'response' => ['nullable', 'string'],
        ]);

        // Update the request status back to pending
        $leaveRequest->status = 'pending';
        $leaveRequest->clarification_requested_at = null; // Clear the clarification timestamp

        // Update the reason with the employee's clarification response
        if (!empty($data['response'])) {
            $leaveRequest->reason = $data['response'];
        }

        $leaveRequest->save();

        // Add timeline entry for the response
        LeaveRequestTimeline::create([
            'leave_request_id' => $leaveRequest->id,
            'action' => 'clarification_responded',
            'notes' => $data['response'] ?? 'Employee responded to clarification.',
            'performed_by_type' => 'employee',
            'performed_by_id' => $employee->id,
        ]);

        // Update pending deductions since the request is back to pending
        $leaveService = new LeaveService();
        $leaveService->updatePendingDeductions($employee->id);

        return response()->json(['message' => 'Clarification response submitted successfully.']);
    }

    public function viewPolicies(Request $request)
    {
        $employee = $request->user();

        $attendancePolicy = $employee->policy;

        $leavePolicies = $employee->leavePolicies->map(function ($policy) {
            return [
                'id' => $policy->id,
                'name' => $policy->name,
                'code' => $policy->code,
                'description' => $policy->description,
                'yearly_quota' => $policy->yearly_quota,
                'monthly_accrual_value' => $policy->monthly_accrual_value,
            ];
        });

        return response()->json([
            'attendance_policy' => $attendancePolicy ? [
                'id' => $attendancePolicy->id,
                'name' => $attendancePolicy->name,
                'description' => $attendancePolicy->description,
                'work_start_time' => $attendancePolicy->work_start_time,
                'work_end_time' => $attendancePolicy->work_end_time,
                'break_duration' => $attendancePolicy->break_duration,
                'grace_period' => $attendancePolicy->grace_period,
            ] : null,
            'leave_policies' => $leavePolicies,
        ]);
    }

    public function submitCorrectionRequest(Request $request)
    {
        $employee = $request->user();

        $data = $request->validate([
            'attendance_id' => 'nullable|exists:attendances,id',
            'date' => 'nullable|date',
            'type' => 'required|in:missing,wrong_checkin,wrong_checkout,wrong_break',
            'requested_check_in' => 'nullable|date_format:H:i',
            'requested_check_out' => 'nullable|date_format:H:i',
            'breaks' => 'nullable|array',
            'breaks.*.break_start' => 'nullable|date_format:H:i',
            'breaks.*.break_end' => 'nullable|date_format:H:i',
            'reason' => 'required|string|max:500',
        ]);

        if ($data['type'] === 'missing' && (!$data['requested_check_in'] || !$data['requested_check_out'])) {
            return response()->json(['message' => 'Check-in and check-out times are required for missing attendance'], 400);
        }

        if ($data['type'] === 'wrong_checkin' && !$data['requested_check_in']) {
            return response()->json(['message' => 'Check-in time is required for wrong check-in correction'], 400);
        }

        if ($data['type'] === 'wrong_checkout' && !$data['requested_check_out']) {
            return response()->json(['message' => 'Check-out time is required for wrong check-out correction'], 400);
        }

        if ($data['type'] === 'wrong_break' && empty($data['breaks'])) {
            return response()->json(['message' => 'Break times are required for wrong break correction'], 400);
        }

        if (in_array($data['type'], ['wrong_checkin', 'wrong_checkout', 'wrong_break']) && empty($data['attendance_id'])) {
            return response()->json(['message' => 'Attendance ID is required for wrong check-in/out/break corrections'], 400);
        }

        $correctionRequest = \App\Models\AttendanceCorrectionRequest::create([
            'employee_id' => $employee->id,
            'attendance_id' => !empty($data['attendance_id']) ? $data['attendance_id'] : null,
            'date' => $data['date'] ?? null,
            'type' => $data['type'],
            'requested_check_in' => $data['requested_check_in'] ? Carbon::createFromFormat('H:i', $data['requested_check_in'])->toDateTimeString() : null,
            'requested_check_out' => $data['requested_check_out'] ? Carbon::createFromFormat('H:i', $data['requested_check_out'])->toDateTimeString() : null,
            'requested_breaks' => isset($data['breaks']) ? json_encode($data['breaks']) : null,
            'reason' => $data['reason'],
        ]);

        // Send email notification to all admins
        $admins = Admin::all();
        foreach ($admins as $admin) {
            Mail::to($admin->email)->send(new AttendanceCorrectionRequestSubmittedMail($correctionRequest));
        }

        return response()->json([
            'message' => 'Correction request submitted successfully',
            'request' => $correctionRequest->load('employee')
        ], 201);
    }

    public function getCorrectionRequests(Request $request)
    {
        try {
            $employee = $request->user();

            $requests = \App\Models\AttendanceCorrectionRequest::where('employee_id', $employee->id)
                ->with('attendance')
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($request) {
                    try {
                        // Determine the date for the request
                        $requestDate = null;
                        if ($request->date) {
                            $requestDate = $request->date;
                        } elseif ($request->attendance) {
                            $requestDate = $request->attendance->date;
                        } elseif ($request->type === 'missing' && $request->requested_check_in) {
                            $requestDate = Carbon::parse($request->requested_check_in)->toDateString();
                        }

                        return [
                            'id' => $request->id,
                            'type' => $request->type,
                            'requested_check_in' => $request->requested_check_in ? Carbon::parse($request->requested_check_in)->format('H:i') : null,
                            'requested_check_out' => $request->requested_check_out ? Carbon::parse($request->requested_check_out)->format('H:i') : null,
                            'requested_breaks' => $request->requested_breaks,
                            'reason' => $request->reason,
                            'status' => $request->status,
                            'submitted_at' => $request->created_at->toISOString(),
                            'processed_at' => $request->approved_at ?? $request->rejected_at,
                            'date' => $requestDate,
                            'attendance' => $request->attendance ? [
                                'id' => $request->attendance->id,
                                'date' => $request->attendance->date,
                                'check_in' => $request->attendance->check_in ? $request->attendance->check_in->format('H:i') : null,
                                'check_out' => $request->attendance->check_out ? $request->attendance->check_out->format('H:i') : null,
                            ] : null,
                        ];
                    } catch (\Exception $e) {
                        \Log::error('Error processing correction request ' . $request->id . ': ' . $e->getMessage());
                        return null; // Skip this request
                    }
                })
                ->filter(function ($request) {
                    return $request !== null;
                });

            return response()->json(['requests' => $requests]);
        } catch (\Exception $e) {
            \Log::error('Error in getCorrectionRequests: ' . $e->getMessage());
            return response()->json(['message' => 'An error occurred while fetching correction requests'], 500);
        }
    }

    private function generateAvatar($name)
    {
        // Generate initials from name
        $initials = strtoupper(substr($name, 0, 1));
        if (strpos($name, ' ') !== false) {
            $parts = explode(' ', $name);
            $initials = strtoupper(substr($parts[0], 0, 1) . substr($parts[count($parts) - 1], 0, 1));
        }

        // Generate a simple SVG avatar with initials
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="64" fill="#0D8ABC"/>
            <text x="64" y="64" font-family="Arial, sans-serif" font-size="48" font-weight="600" text-anchor="middle" fill="white" dominant-baseline="middle">' . htmlspecialchars($initials) . '</text>
        </svg>';

        // Return SVG as base64 encoded data URL for better compatibility
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}
