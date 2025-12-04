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
use Symfony\Component\HttpFoundation\StreamedResponse;

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

        // Leave balances
        $policies = $employee->leavePolicies;
        $leaveBalancesArray = [];
        foreach ($policies as $policy) {
            $balanceRecord = LeaveBalance::where('employee_id', $employee->id)
                ->where('leave_policy_id', $policy->id)
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
                    $openingBalance = $initialBalance;
                    $accrued = 0;
                    $balanceValue = $initialBalance;
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

            $available = $balanceRecord->balance - $balanceRecord->pending_deduction;
            // For monthly accrual policies, total is the accrued this year, not the balance
            if ($policy->monthly_accrual_value > 0) {
                $total = $balanceRecord->accrued_this_year + $balanceRecord->carry_forward_balance;
            } else {
                $total = $balanceRecord->balance + $balanceRecord->carry_forward_balance;
            }

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
                    ->first();
                if ($updated) {
                    $bal['pending_deduction'] = $updated->pending_deduction;
                    $bal['available'] = max(0, $updated->balance - $updated->pending_deduction);
                }
            }
        }

        // Pending requests
        $pendingRequests = LeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'clarification'])
            ->orderByDesc('created_at')
            ->get(['id', 'from_date', 'to_date', 'status', 'reason', 'leave_type', 'total_days', 'created_at']);

        $pendingRequestsFormatted = $pendingRequests->map(function ($request) {
            return [
                'id' => $request->id,
                'type' => $request->leave_type ?? 'Leave',
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'days' => $request->total_days ?? 1,
                'reason' => $request->reason,
                'submitted_at' => $request->created_at->toDateString(),
            ];
        });

        // Recent requests
        $recentRequests = LeaveRequest::where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'from_date', 'to_date', 'status', 'reason', 'leave_type', 'total_days', 'created_at']);

        $recentRequestsFormatted = $recentRequests->map(function ($request) {
            return [
                'id' => $request->id,
                'type' => $request->leave_type ?? 'Leave',
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'days' => $request->total_days ?? 1,
                'status' => ucfirst($request->status),
                'reason' => $request->reason,
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
            'pending_requests' => $pendingRequestsFormatted,
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
                ->first();

            // Create balance record if it doesn't exist
            if (!$balanceRecord) {
                $leaveService = new LeaveService();
                $initialBalance = $leaveService->calculateProratedBalance($policy, $employee->join_date ?? now());

                // For monthly accrual policies, start with 0 balance and accrue monthly
                if ($policy->monthly_accrual_value > 0) {
                    $balanceValue = 0;
                } else {
                    $balanceValue = $initialBalance;
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

        $attendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])
            ->with('employee.policy', 'breaks')
            ->get()
            ->keyBy(function($item) {
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
                    'breaks' => $attendance->breaks->map(function($break) {
                        return [
                            'break_out' => $break->break_start ? $break->break_start->toISOString() : null,
                            'break_in' => $break->break_end ? $break->break_end->toISOString() : null,
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
            ->keyBy(function($item) {
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
                    'breaks' => $attendance->breaks->map(function($break) {
                        return [
                            'break_out' => $break->break_start ? $break->break_start->toISOString() : null,
                            'break_in' => $break->break_end ? $break->break_end->toISOString() : null,
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

        $callback = function() use ($result, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($result as $record) {
                $breaksText = '';
                $breakDetails = '';
                if (is_array($record['breaks']) && count($record['breaks']) > 0) {
                    $breaksText = count($record['breaks']) . ' times';
                    $breakDetailsArray = [];
                    foreach ($record['breaks'] as $index => $break) {
                        $out = $break['break_out'] ? Carbon::parse($break['break_out'])->setTimezone(config('app.timezone'))->format('H:i') : '-';
                        $in = $break['break_in'] ? Carbon::parse($break['break_in'])->setTimezone(config('app.timezone'))->format('H:i') : '-';
                        $breakDetailsArray[] = "Break " . ($index + 1) . ": {$out}-{$in}";
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
            ->get(['id', 'name', 'date', 'type'])
            ->map(function ($holiday) {
                return [
                    'id' => $holiday->id,
                    'name' => $holiday->name,
                    'date' => $holiday->date->toDateString(),
                    'type' => $holiday->type,
                ];
            });

        return response()->json([
            'year' => $year,
            'holidays' => $holidays,
        ]);
    }
}

