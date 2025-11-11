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
            ->with('employee', 'breaks')
            ->get()
            ->map(function ($attendance) {
                $checkIn = $attendance->check_in ? $attendance->check_in->toISOString() : null;
                $checkOut = $attendance->check_out ? $attendance->check_out->toISOString() : null;

                $totalHours = null;
                if ($checkIn && $checkOut) {
                    $totalMinutes = Carbon::parse($checkOut)->diffInMinutes(Carbon::parse($checkIn));
                    $hours = floor($totalMinutes / 60);
                    $minutes = $totalMinutes % 60;
                    $totalHours = $hours . 'h ' . $minutes . 'm';
                }

                // Determine status based on attendance data
                $status = $attendance->status;
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

                return [
                    'date' => $attendance->date,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'total_hours' => $totalHours,
                    'breaks' => $attendance->breaks->count(),
                    'status' => $status
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
                fputcsv($file, [
                    $attendance['date'],
                    $attendance['check_in'] ? Carbon::parse($attendance['check_in'])->format('H:i') : '-',
                    $attendance['check_out'] ? Carbon::parse($attendance['check_out'])->format('H:i') : '-',
                    $attendance['total_hours'] ?? '-',
                    $attendance['breaks'] ? "{$attendance['breaks']} times" : '-',
                    $attendance['status']
                ]);
            }

            fclose($file);
        };

        return new StreamedResponse($callback, 200, $headers);
    }
}