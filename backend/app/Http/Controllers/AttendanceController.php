<?php

namespace App\Http\Controllers\Api;

use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceController extends Controller
{
    public function getEmployeeMonthlyAttendance($employeeId, $year, $month)
    {
        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        return Attendance::where('employee_id', $employeeId)
            ->whereBetween('date', [$startDate, $endDate])
            ->with('employee')
            ->get()
            ->map(function ($attendance) {
                $checkIn = $attendance->check_in ? Carbon::parse($attendance->check_in)->format('H:i') : null;
                $checkOut = $attendance->check_out ? Carbon::parse($attendance->check_out)->format('H:i') : null;
                
                $totalHours = null;
                if ($checkIn && $checkOut) {
                    $totalMinutes = Carbon::parse($checkOut)->diffInMinutes(Carbon::parse($checkIn));
                    $hours = floor($totalMinutes / 60);
                    $minutes = $totalMinutes % 60;
                    $totalHours = $hours . 'h ' . $minutes . 'm';
                }

                return [
                    'date' => $attendance->date,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'total_hours' => $totalHours,
                    'breaks_count' => $attendance->breaks_count,
                    'is_late' => $attendance->is_late,
                    'is_early_departure' => $attendance->is_early_departure,
                    'is_absent' => $attendance->is_absent,
                    'is_leave' => $attendance->is_leave,
                    'is_holiday' => $attendance->is_holiday
                ];
            });
    }

    public function exportEmployeeMonthlyAttendance($employeeId, $year, $month)
    {
        $employee = Employee::findOrFail($employeeId);
        $attendances = $this->getEmployeeMonthlyAttendance($employeeId, $year, $month);
        
        $filename = "attendance-{$employee->name}-{$year}-{$month}.csv";
        
        $headers = [
            "Content-type" => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $columns = ['Date', 'Check In', 'Check Out', 'Total Hours', 'Breaks', 'Status'];

        $callback = function() use ($attendances, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($attendances as $attendance) {
                $status = 'Present';
                if ($attendance['is_late']) {
                    $status = 'Late Entry';
                } elseif ($attendance['is_early_departure']) {
                    $status = 'Late Departure';
                } elseif ($attendance['is_absent']) {
                    $status = 'Absent';
                } elseif ($attendance['is_leave']) {
                    $status = 'On Leave';
                } elseif ($attendance['is_holiday']) {
                    $status = 'Holiday';
                }

                fputcsv($file, [
                    $attendance['date'],
                    $attendance['check_in'] ?? '-',
                    $attendance['check_out'] ?? '-',
                    $attendance['total_hours'] ?? '-',
                    $attendance['breaks_count'] ? "{$attendance['breaks_count']} times" : '-',
                    $status
                ]);
            }

            fclose($file);
        };

        return new StreamedResponse($callback, 200, $headers);
    }
}