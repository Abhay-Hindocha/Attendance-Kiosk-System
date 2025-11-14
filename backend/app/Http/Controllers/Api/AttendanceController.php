<?php

// This is the AttendanceController, which handles all attendance-related API operations.
// It manages CRUD operations for attendance records, statistics, and face recognition marking.

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\BreakRecord;
use App\Models\Holiday;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceController extends Controller
{
    // Get a list of attendance records with optional filtering and pagination
    // Supports filters: employee_id, month/year, date, status
    public function index(Request $request)
    {
        // Start with a query that includes the related employee data
        $query = Attendance::with('employee');

        // Filter by employee ID if provided in the request
        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by month and year if both are provided
        if ($request->has('month') && $request->has('year')) {
            $query->whereMonth('date', $request->month)
                  ->whereYear('date', $request->year);
        }

        // Filter by specific date if provided
        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        // Filter by attendance status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Paginate the results (default 15 per page, can be overridden)
        $perPage = $request->get('per_page', 15);
        $attendances = $query->paginate($perPage);

        // Return the paginated attendance records as JSON
        return response()->json($attendances);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'date' => 'required|date',
            'status' => 'required|in:present,absent,late,half_day',
        ]);

        $attendance = Attendance::create($request->all());
        return response()->json($attendance->load('employee'), 201);
    }

    public function show(Attendance $attendance)
    {
        return response()->json($attendance->load('employee'));
    }

    public function update(Request $request, Attendance $attendance)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'date' => 'required|date',
            'status' => 'required|in:present,absent,late,half_day',
        ]);

        $attendance->update($request->all());
        return response()->json($attendance->load('employee'));
    }

    public function destroy(Attendance $attendance)
    {
        $attendance->delete();
        return response()->json(['message' => 'Attendance record deleted successfully']);
    }

    public function getStats()
    {
        $today = Carbon::today()->toDateString();
        $yesterday = Carbon::yesterday()->toDateString();

        $stats = [
            'total_employees' => Employee::count(),
            'present_today' => DB::table('attendances')
                ->where('date', $today)
                ->whereIn('status', ['present', 'late'])
                ->whereNotNull('check_in')
                ->count(),
            'absent_today' => DB::table('employees')
                ->join('policies', 'employees.policy_id', '=', 'policies.id')
                ->leftJoin('attendances', function($join) use ($today) {
                    $join->on('employees.id', '=', 'attendances.employee_id')
                         ->where('attendances.date', $today);
                })
                ->where(function($query) use ($today) {
                    $query->where('policies.effective_to', '>=', $today)
                          ->orWhereNull('policies.effective_to');
                })
                ->where(function($query) use ($today) {
                    $query->where('policies.effective_from', '<=', $today)
                          ->orWhereNull('policies.effective_from');
                })
                ->where('policies.enable_absence_tracking', true)
                ->where(function($query) {
                    $query->whereNull('attendances.id')
                        ->orWhere(function($q) {
                            $q->whereNull('attendances.check_in')
                              ->whereNull('attendances.check_out');
                        });
                })
                ->count(),
            'on_leave' => Employee::where('status', 'on_leave')->count(),
            'late_arrivals' => DB::table('attendances')
                ->join('employees', 'attendances.employee_id', '=', 'employees.id')
                ->join('policies', 'employees.policy_id', '=', 'policies.id')
                ->where('attendances.date', $today)
                ->whereNotNull('attendances.check_in')
                ->where(function($query) use ($today) {
                    $query->where('policies.effective_to', '>=', $today)
                          ->orWhereNull('policies.effective_to');
                })
                ->where(function($query) use ($today) {
                    $query->where('policies.effective_from', '<=', $today)
                          ->orWhereNull('policies.effective_from');
                })
                ->where('policies.enable_late_tracking', true)
                ->whereRaw("TIME(attendances.check_in) > policies.work_start_time")
                ->count(),
            'early_departures' => DB::table('attendances')
                ->join('employees', 'attendances.employee_id', '=', 'employees.id')
                ->join('policies', 'employees.policy_id', '=', 'policies.id')
                ->where('attendances.date', $today)
                ->whereNotNull('attendances.check_out')
                ->where(function($query) use ($today) {
                    $query->where('policies.effective_to', '>=', $today)
                          ->orWhereNull('policies.effective_to');
                })
                ->where(function($query) use ($today) {
                    $query->where('policies.effective_from', '<=', $today)
                          ->orWhereNull('policies.effective_from');
                })
                ->where('policies.enable_early_tracking', true)
                ->whereRaw("TIME(attendances.check_out) < policies.work_end_time")
                ->count(),
        ];

        // Calculate changes from yesterday
        $yesterday_stats = [
            'present_yesterday' => DB::table('attendances')
                ->where('date', $yesterday)
                ->whereIn('status', ['present', 'late'])
                ->whereNotNull('check_in')
                ->count(),
            'absent_yesterday' => DB::table('employees')
                ->join('policies', 'employees.policy_id', '=', 'policies.id')
                ->leftJoin('attendances', function($join) use ($yesterday) {
                    $join->on('employees.id', '=', 'attendances.employee_id')
                         ->where('attendances.date', $yesterday);
                })
                ->where(function($query) use ($yesterday) {
                    $query->where('policies.effective_to', '>=', $yesterday)
                          ->orWhereNull('policies.effective_to');
                })
                ->where(function($query) use ($yesterday) {
                    $query->where('policies.effective_from', '<=', $yesterday)
                          ->orWhereNull('policies.effective_from');
                })
                ->where('policies.enable_absence_tracking', true)
                ->where(function($query) {
                    $query->whereNull('attendances.id')
                        ->orWhere(function($q) {
                            $q->whereNull('attendances.check_in')
                              ->whereNull('attendances.check_out');
                        });
                })
                ->count(),
            'on_leave_yesterday' => Employee::where('status', 'on_leave')->count(),
            'late_arrivals_yesterday' => DB::table('attendances')
                ->join('employees', 'attendances.employee_id', '=', 'employees.id')
                ->join('policies', 'employees.policy_id', '=', 'policies.id')
                ->where('attendances.date', $yesterday)
                ->whereNotNull('attendances.check_in')
                ->where(function($query) use ($yesterday) {
                    $query->where('policies.effective_to', '>=', $yesterday)
                          ->orWhereNull('policies.effective_to');
                })
                ->where(function($query) use ($yesterday) {
                    $query->where('policies.effective_from', '<=', $yesterday)
                          ->orWhereNull('policies.effective_from');
                })
                ->where('policies.enable_late_tracking', true)
                ->whereRaw("DATE_FORMAT(check_in, '%H:%i:%s') > work_start_time")
                ->count(),
            'early_departures_yesterday' => DB::table('attendances')
                ->join('employees', 'attendances.employee_id', '=', 'employees.id')
                ->join('policies', 'employees.policy_id', '=', 'policies.id')
                ->where('attendances.date', $yesterday)
                ->whereNotNull('attendances.check_out')
                ->where(function($query) use ($yesterday) {
                    $query->where('policies.effective_to', '>=', $yesterday)
                          ->orWhereNull('policies.effective_to');
                })
                ->where(function($query) use ($yesterday) {
                    $query->where('policies.effective_from', '<=', $yesterday)
                          ->orWhereNull('policies.effective_from');
                })
                ->where('policies.enable_early_tracking', true)
                ->whereRaw("DATE_FORMAT(check_out, '%H:%i:%s') < work_end_time")
                ->count()
        ];

        $stats['changes'] = [
            'present' => $stats['present_today'] - $yesterday_stats['present_yesterday'],
            'absent' => $stats['absent_today'] - $yesterday_stats['absent_yesterday'],
            'on_leave' => $stats['on_leave'] - $yesterday_stats['on_leave_yesterday'],
            'late_arrivals' => $stats['late_arrivals'] - $yesterday_stats['late_arrivals_yesterday'],
            'early_departures' => $stats['early_departures'] - $yesterday_stats['early_departures_yesterday']
        ];

        return response()->json($stats);
    }

    public function getDepartmentStats()
    {
        $today = Carbon::today()->toDateString();

        $departmentStats = DB::table('employees')
            ->select(
                'department',
                DB::raw('COUNT(DISTINCT employees.id) as total_employees'),
                DB::raw("COUNT(DISTINCT CASE WHEN attendances.status IN ('present', 'late') THEN employees.id END) as present_employees")
            )
            ->leftJoin('attendances', function($join) use ($today) {
                $join->on('employees.id', '=', 'attendances.employee_id')
                    ->where('attendances.date', '=', $today);
            })
            ->groupBy('department')
            ->get();

        $stats = [];
        foreach ($departmentStats as $dept) {
            $stats[] = [
                'department' => $dept->department,
                'total' => $dept->total_employees,
                'present' => $dept->present_employees,
                'percentage' => $dept->total_employees > 0
                    ? round(($dept->present_employees / $dept->total_employees) * 100)
                    : 0
            ];
        }

        return response()->json($stats);
    }

    public function getAttendanceTrends()
    {
        $today = Carbon::today();
        $lastWeek = Carbon::today()->subDays(7);

        // Calculate average check-in time properly
        $avgCheckInResult = DB::select("
            SELECT SEC_TO_TIME(AVG(TIME_TO_SEC(TIME(check_in)))) as avg_time
            FROM attendances
            WHERE date BETWEEN ? AND ?
            AND check_in IS NOT NULL
            AND status IN ('present', 'late')
        ", [$lastWeek->toDateString(), $today->toDateString()]);

        $avgCheckIn = $avgCheckInResult[0]->avg_time ?? null;

        $trends = [
            'average_check_in' => $avgCheckIn ? Carbon::parse($avgCheckIn)->format('H:i:s') : '00:00:00',

            'average_work_hours' => Attendance::whereBetween('date', [$lastWeek, $today])
                ->whereNotNull('check_in')
                ->whereNotNull('check_out')
                ->whereIn('status', ['present', 'late'])
                ->avg(DB::raw('TIMESTAMPDIFF(HOUR, check_in, check_out)')),

            'punctuality_rate' => Attendance::whereBetween('date', [$lastWeek, $today])
                ->whereIn('status', ['present', 'late'])
                ->count() > 0
                    ? round(
                        (Attendance::whereBetween('date', [$lastWeek, $today])
                            ->where('status', 'present')
                            ->count() * 100.0) /
                        Attendance::whereBetween('date', [$lastWeek, $today])
                            ->whereIn('status', ['present', 'late'])
                            ->count()
                    )
                    : 0
        ];

        return response()->json($trends);
    }

    public function getLiveActivity()
    {
        $attendances = Attendance::with(['employee:id,name,department', 'breaks'])
            ->where(function ($query) {
                $query->where('check_in', '>=', Carbon::now()->subDay())
                      ->orWhere('check_out', '>=', Carbon::now()->subDay());
            })
            ->where(function ($query) {
                $query->whereNotNull('check_in')
                      ->orWhereNotNull('check_out');
            })
            ->orderBy('check_in', 'desc')
            ->get();

        $activities = [];

        foreach ($attendances as $attendance) {
            // Add Check-In activity if exists
            if ($attendance->check_in) {
                $action = $attendance->status === 'late' ? 'Late Entry' : 'Check-In';
                $activities[] = [
                    'name' => $attendance->employee->name,
                    'action' => $action,
                    'time' => Carbon::parse($attendance->check_in)->format('H:i'),
                    'date' => Carbon::parse($attendance->check_in)->format('M d'),
                    'badge' => strtoupper(substr($attendance->employee->name, 0, 2)),
                    'badgeColor' => 'bg-blue-500'
                ];
            }

            // Add break activities
            foreach ($attendance->breaks as $break) {
                // Break start activity
                $activities[] = [
                    'name' => $attendance->employee->name,
                    'action' => 'Break Start',
                    'time' => Carbon::parse($break->break_start)->format('H:i'),
                    'date' => Carbon::parse($break->break_start)->format('M d'),
                    'badge' => strtoupper(substr($attendance->employee->name, 0, 2)),
                    'badgeColor' => 'bg-yellow-500'
                ];

                // Break end activity if exists
                if ($break->break_end) {
                    $activities[] = [
                        'name' => $attendance->employee->name,
                        'action' => 'Break End',
                        'time' => Carbon::parse($break->break_end)->format('H:i'),
                        'date' => Carbon::parse($break->break_end)->format('M d'),
                        'badge' => strtoupper(substr($attendance->employee->name, 0, 2)),
                        'badgeColor' => 'bg-green-500'
                    ];
                }
            }

            // Add Check-Out activity if exists
            if ($attendance->check_out) {
                $action = 'Check-Out';
                if ($attendance->employee->policy
                    && $attendance->employee->policy->enable_early_tracking
                    && (!$attendance->employee->policy->effective_to || Carbon::parse($attendance->employee->policy->effective_to)->gte(Carbon::today()))
                    && (!$attendance->employee->policy->effective_from || Carbon::parse($attendance->employee->policy->effective_from)->lte(Carbon::today()))) {
                    $workEndTime = Carbon::createFromFormat('H:i:s', $attendance->employee->policy->work_end_time);
                    if (Carbon::parse($attendance->check_out)->lt($workEndTime)) {
                        $action = 'Early Departure';
                    }
                }
                $activities[] = [
                    'name' => $attendance->employee->name,
                    'action' => $action,
                    'time' => Carbon::parse($attendance->check_out)->format('H:i'),
                    'date' => Carbon::parse($attendance->check_out)->format('M d'),
                    'badge' => strtoupper(substr($attendance->employee->name, 0, 2)),
                    'badgeColor' => 'bg-blue-500'
                ];
            }
        }

        // Sort activities by time ascending (chronological order)
        usort($activities, function ($a, $b) {
            $timeA = Carbon::createFromFormat('M d H:i', $a['date'] . ' ' . $a['time']);
            $timeB = Carbon::createFromFormat('M d H:i', $b['date'] . ' ' . $b['time']);
            return $timeA->timestamp - $timeB->timestamp;
        });

        return response()->json($activities);
    }

    public function getPresentToday()
    {
        $today = Carbon::today()->toDateString();

        $presentEmployees = DB::table('attendances')
            ->join('employees', 'attendances.employee_id', '=', 'employees.id')
            ->where('attendances.date', $today)
            ->whereIn('attendances.status', ['present', 'late'])
            ->whereNotNull('attendances.check_in')
            ->select(
                'employees.id',
                'employees.name',
                'employees.department',
                'employees.employee_id',
                DB::raw('TIME(attendances.check_in) as check_in_time'),
                DB::raw('TIME(attendances.check_out) as check_out_time'),
                'attendances.status'
            )
            ->get();

        return response()->json($presentEmployees);
    }

    public function getAbsentToday()
    {
        $today = Carbon::today()->toDateString();

        $absentEmployees = DB::table('employees')
            ->join('policies', 'employees.policy_id', '=', 'policies.id')
            ->leftJoin('attendances', function($join) use ($today) {
                $join->on('employees.id', '=', 'attendances.employee_id')
                     ->where('attendances.date', $today);
            })
            ->where(function($query) use ($today) {
                $query->where('policies.effective_to', '>=', $today)
                      ->orWhereNull('policies.effective_to');
            })
            ->where(function($query) use ($today) {
                $query->where('policies.effective_from', '<=', $today)
                      ->orWhereNull('policies.effective_from');
            })
            ->where('policies.enable_absence_tracking', true)
            ->where(function($query) {
                $query->whereNull('attendances.id')
                    ->orWhere(function($q) {
                        $q->whereNull('attendances.check_in')
                          ->whereNull('attendances.check_out');
                    });
            })
            ->select(
                'employees.id',
                'employees.name',
                'employees.department',
                'employees.employee_id'
            )
            ->get();

        return response()->json($absentEmployees);
    }

    public function getOnLeaveToday()
    {
        $onLeaveEmployees = Employee::where('status', 'on_leave')
            ->select('id', 'name', 'department', 'employee_id')
            ->get();

        return response()->json($onLeaveEmployees);
    }

    public function getLateArrivalsToday()
    {
        $today = Carbon::today()->toDateString();

        $lateArrivals = DB::table('attendances')
            ->join('employees', 'attendances.employee_id', '=', 'employees.id')
            ->join('policies', 'employees.policy_id', '=', 'policies.id')
            ->where('attendances.date', $today)
            ->whereNotNull('attendances.check_in')
            ->where(function($query) use ($today) {
                $query->where('policies.effective_to', '>=', $today)
                      ->orWhereNull('policies.effective_to');
            })
            ->where(function($query) use ($today) {
                $query->where('policies.effective_from', '<=', $today)
                      ->orWhereNull('policies.effective_from');
            })
            ->where('policies.enable_late_tracking', true)
            ->whereRaw("TIME(attendances.check_in) > policies.work_start_time")
            ->select(
                'employees.id',
                'employees.name',
                'employees.department',
                'employees.employee_id',
                DB::raw('TIME(attendances.check_in) as check_in_time'),
                DB::raw('TIME(attendances.check_out) as check_out_time'),
                'attendances.status'
            )
            ->get();

        return response()->json($lateArrivals);
    }

    public function getEarlyDeparturesToday()
    {
        $today = Carbon::today()->toDateString();

        $earlyDepartures = DB::table('attendances')
            ->join('employees', 'attendances.employee_id', '=', 'employees.id')
            ->join('policies', 'employees.policy_id', '=', 'policies.id')
            ->where('attendances.date', $today)
            ->whereNotNull('attendances.check_out')
            ->where(function($query) use ($today) {
                $query->where('policies.effective_to', '>=', $today)
                      ->orWhereNull('policies.effective_to');
            })
            ->where(function($query) use ($today) {
                $query->where('policies.effective_from', '<=', $today)
                      ->orWhereNull('policies.effective_from');
            })
            ->where('policies.enable_early_tracking', true)
            ->whereRaw("TIME(attendances.check_out) < policies.work_end_time")
            ->select(
                'employees.id',
                'employees.name',
                'employees.department',
                'employees.employee_id',
                DB::raw('TIME(attendances.check_in) as check_in_time'),
                DB::raw('TIME(attendances.check_out) as check_out_time'),
                'attendances.status'
            )
            ->get();

        return response()->json($earlyDepartures);
    }

    public function markAttendance(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|string|exists:employees,employee_id',
        ]);

        $employee = Employee::with('policy')->where('employee_id', $request->employee_id)->first();
        $today = Carbon::today()->toDateString();
        $now = Carbon::now();

        // Check if attendance already exists for today
        $existingAttendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        if ($existingAttendance) {
            // Increment scan count
            $scanCount = $existingAttendance->scan_count + 1;
            $scanTimes = $existingAttendance->scan_times ?? [];
            $scanTimes[] = $now->toDateTimeString();
            $existingAttendance->update(['scan_count' => $scanCount, 'scan_times' => $scanTimes]);

            if ($scanCount == 2) {
                // 2nd scan: Check-out
                $existingAttendance->update(['check_out' => $now]);
                // Calculate total hours and update status if necessary
                $this->updateAttendanceStatusBasedOnHours($existingAttendance);
                return response()->json([
                    'message' => 'Check-out marked successfully',
                    'attendance' => $existingAttendance->load('employee')
                ]);
            } elseif ($scanCount % 2 == 0) {
                // Even scans >2: Check-out (initially)
                $existingAttendance->update(['check_out' => $now]);
                // Calculate total hours and update status if necessary
                $this->updateAttendanceStatusBasedOnHours($existingAttendance);
                return response()->json([
                    'message' => 'Check-out marked successfully',
                    'attendance' => $existingAttendance->load('employee')
                ]);
            } else {
                // Odd scans >2: Break end, retroactively change previous even to break start
                $existingAttendance->update(['check_out' => null]);
                $breakStartIndex = $scanCount - 2;
                $breakStartTime = Carbon::parse($scanTimes[$breakStartIndex]);
                BreakRecord::create([
                    'attendance_id' => $existingAttendance->id,
                    'break_start' => $breakStartTime,
                    'break_end' => $now,
                ]);
                return response()->json([
                    'message' => 'Break end marked successfully',
                    'attendance' => $existingAttendance->load('employee')
                ]);
            }
        }

        // Determine status based on employee's policy
        $status = 'present';
        if ($employee->policy
            && $employee->policy->enable_late_tracking
            && (!$employee->policy->effective_to || Carbon::parse($employee->policy->effective_to)->gte(Carbon::today()))
            && (!$employee->policy->effective_from || Carbon::parse($employee->policy->effective_from)->lte(Carbon::today()))) {
            $workStartTime = Carbon::createFromFormat('H:i:s', $employee->policy->work_start_time);
            $gracePeriod = $employee->policy->late_grace_period ?? 0;
            $allowedCheckInTime = $workStartTime->addMinutes($gracePeriod);

            if ($now->greaterThan($allowedCheckInTime)) {
                $status = 'late';
            }
        } else {
            // Default logic if no policy or inactive
            if ($now->hour >= 9) {
                $status = 'late';
            }
        }

        // Create new attendance record
        $attendance = Attendance::create([
            'employee_id' => $employee->id,
            'check_in' => $now,
            'date' => $today,
            'status' => $status,
            'scan_count' => 1,
            'scan_times' => [$now->toDateTimeString()],
        ]);

        return response()->json([
            'message' => 'Check-in marked successfully',
            'attendance' => $attendance->load('employee')
        ], 201);
    }

    public function getEmployeeMonthlyAttendance($employeeId, $year, $month)
    {
        \Log::info("getEmployeeMonthlyAttendance called", ['employeeId' => $employeeId, 'year' => $year, 'month' => $month]);

        // First try to find by employee_id (string), then by id (integer)
        $employee = Employee::where('employee_id', $employeeId)->orWhere('id', $employeeId)->first();
        if (!$employee) {
            \Log::warning("Employee not found", ['employeeId' => $employeeId]);
            return response()->json([]);
        }

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        \Log::info("Date range", ['startDate' => $startDate->toDateString(), 'endDate' => $endDate->toDateString()]);

        $attendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$startDate, $endDate])
            ->with('employee', 'breaks')
            ->get()
            ->keyBy(function($item) {
                return Carbon::parse($item->date)->toDateString();
            });

        \Log::info("Attendances found", ['count' => $attendances->count(), 'attendances' => $attendances->toArray()]);

        $holidays = Holiday::whereBetween('date', [$startDate, $endDate])
            ->get()
            ->keyBy('date');

        $result = [];
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateKey = $date->toDateString();
            $attendance = $attendances->get($dateKey);
            $holiday = $holidays->get($dateKey);

            // Check if employee is on leave for this date
            $isOnLeave = $employee->status === 'on_leave' && $date->isToday();

            if ($attendance) {
                \Log::info("Processing attendance for date", ['date' => $dateKey, 'attendance' => $attendance->toArray(), 'breaks_count' => $attendance->breaks->count()]);

                $checkIn = $attendance->check_in ? $attendance->check_in->toISOString() : null;
                $checkOut = $attendance->check_out ? $attendance->check_out->toISOString() : null;

                $totalHours = null;
                $totalMinutesWorked = null;
                if ($attendance->check_in && $attendance->check_out) {
                    // Total minutes between check-in and check-out (absolute)
                    $totalMinutes = $attendance->check_out->diffInMinutes($attendance->check_in, true);

                    // Subtract break durations (if any) to get actual worked minutes
                    $breakMinutes = 0;
                    foreach ($attendance->breaks as $br) {
                        if ($br->break_start && $br->break_end) {
                            $breakMinutes += $br->break_end->diffInMinutes($br->break_start, true);
                        }
                    }

                    $totalMinutesWorked = max(0, $totalMinutes - $breakMinutes);

                    // Format total hours from worked minutes
                    $grossHours = floor($totalMinutesWorked / 60);
                    $grossMinutes = $totalMinutesWorked % 60;
                    $totalHours = $grossHours . 'h ' . $grossMinutes . 'm';
                }

                // Determine status based on attendance data
                $status = $attendance->status;

                // Auto-update status based on hours if not already set to half_day or absent
                if ($status !== 'half_day' && $status !== 'absent' && $totalMinutesWorked !== null && $employee->policy) {
                    $policy = $employee->policy;
                    if (!$policy->effective_to || Carbon::parse($policy->effective_to)->gte(Carbon::parse($dateKey))
                        && (!$policy->effective_from || Carbon::parse($policy->effective_from)->lte(Carbon::parse($dateKey)))) {

                        $halfDayMinutes = ($policy->half_day_hours * 60) + $policy->half_day_minutes;
                        $fullDayMinutes = ($policy->full_day_hours * 60) + $policy->full_day_minutes;

                        if ($totalMinutesWorked >= $halfDayMinutes && $totalMinutesWorked < $fullDayMinutes) {
                            $status = 'half_day';
                            // Update the database record
                            $attendance->update(['status' => 'half_day']);
                        } elseif ($status === 'present' && $totalMinutesWorked < 0) {
                            // Handle cases where breaks exceed work time, set to half day
                            $status = 'half_day';
                            $attendance->update(['status' => 'half_day']);
                        }
                    }
                }

                if ($status === 'late') {
                    $status = 'Late Entry';
                } elseif ($status === 'present') {
                    $status = 'Present';
                } elseif ($status === 'absent') {
                    $status = 'Absent';
                } elseif ($status === 'half_day') {
                    $status = 'Half Day';
                } else {
                    $status = ucfirst($status);
                }

                $result[] = [
                    'date' => $dateKey,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'total_hours' => $totalHours,
                    'breaks' => $attendance->breaks->map(function($break) {
                        return [
                            'in_time' => $break->break_start ? $break->break_start->toISOString() : null,
                            'out_time' => $break->break_end ? $break->break_end->toISOString() : null,
                        ];
                    })->toArray(),
                    'status' => $status,
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
            } elseif ($isOnLeave) {
                $result[] = [
                    'date' => $dateKey,
                    'check_in' => null,
                    'check_out' => null,
                    'total_hours' => null,
                    'breaks' => [],
                    'status' => 'On Leave',
                    'leave_reason' => $employee->leave_reason,
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

        \Log::info("Final result", ['result' => $result]);

        return $result;
    }

    private function updateAttendanceStatusBasedOnHours(Attendance $attendance)
    {
        if (!$attendance->check_in || !$attendance->check_out) {
            return;
        }

        $employee = $attendance->employee;
        if (!$employee->policy) {
            return;
        }

        $policy = $employee->policy;
        if (!$policy->effective_to || Carbon::parse($policy->effective_to)->gte(Carbon::today())
            && (!$policy->effective_from || Carbon::parse($policy->effective_from)->lte(Carbon::today()))) {

            $totalMinutes = Carbon::parse($attendance->check_out)->diffInMinutes(Carbon::parse($attendance->check_in));

            // Subtract break durations
            foreach ($attendance->breaks as $break) {
                if ($break->break_start && $break->break_end) {
                    $breakMinutes = Carbon::parse($break->break_end)->diffInMinutes(Carbon::parse($break->break_start));
                    $totalMinutes -= $breakMinutes;
                }
            }

            $halfDayMinutes = ($policy->half_day_hours * 60) + $policy->half_day_minutes;
            $fullDayMinutes = ($policy->full_day_hours * 60) + $policy->full_day_minutes;

            if ($totalMinutes >= $halfDayMinutes && $totalMinutes < $fullDayMinutes) {
                $attendance->update(['status' => 'half_day']);
            }
        }
    }

    public function exportEmployeeMonthlyAttendance($employeeId, $year, $month)
    {
        $employee = Employee::where('employee_id', $employeeId)->orWhere('id', $employeeId)->first();
        if (!$employee) {
            return response()->json(['error' => 'Employee not found'], 404);
        }
        $attendances = $this->getEmployeeMonthlyAttendance($employeeId, $year, $month);

        $filename = "attendance-{$employee->name}-{$year}-{$month}.csv";

        $headers = [
            "Content-type" => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $columns = ['Date', 'Check In', 'Check Out', 'Total Hours', 'Breaks', 'Break Details', 'Status'];

        $callback = function() use ($attendances, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($attendances as $attendance) {
                $breaksText = '';
                $breakDetails = '';
                if (is_array($attendance['breaks']) && count($attendance['breaks']) > 0) {
                    $breaksText = count($attendance['breaks']) . ' times';
                    $breakDetailsArray = [];
                    foreach ($attendance['breaks'] as $index => $break) {
                        $in = $break['in_time'] ? Carbon::parse($break['in_time'])->format('H:i') : '-';
                        $out = $break['out_time'] ? Carbon::parse($break['out_time'])->format('H:i') : '-';
                        $breakDetailsArray[] = "Break " . ($index + 1) . ": {$in}-{$out}";
                    }
                    $breakDetails = implode(', ', $breakDetailsArray);
                } elseif (is_numeric($attendance['breaks'])) {
                    $breaksText = $attendance['breaks'] . ' times';
                    $breakDetails = '-';
                } else {
                    $breaksText = '-';
                    $breakDetails = '-';
                }
                fputcsv($file, [
                    $attendance['date'],
                    $attendance['check_in'] ? Carbon::parse($attendance['check_in'])->format('H:i') : '-',
                    $attendance['check_out'] ? Carbon::parse($attendance['check_out'])->format('H:i') : '-',
                    $attendance['total_hours'] ?? '-',
                    $breaksText,
                    $breakDetails,
                    $attendance['status']
                ]);
            }

            fclose($file);
        };

        return new StreamedResponse($callback, 200, $headers);
    }
}
