<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;

/**
 * AttendanceLogic Service
 *
 * This service handles all attendance status calculation logic based on the policy settings.
 * It implements the following rules:
 *
 * 1. Late Arrival Tracking:
 *    - If check-in is within grace period: Normal entry (Present)
 *    - If check-in is after grace period: Late Arrival
 *
 * 2. Total Work Duration Calculation:
 *    - Calculate actual worked time (check-in to check-out minus breaks if policy excludes breaks)
 *    - Respects the "include_break" flag in policy
 *
 * 3. Attendance Classification:
 *    - Less than half day hours: Absent
 *    - Half day to one hour less than full day: Half Day
 *    - One hour before full day to work end time (grace period): Present
 *    - Before one hour mark with early tracking enabled: Early Departure (unless within grace period)
 *
 * 4. Early Departure Tracking:
 *    - If check-out is in the last hour before work end time but after grace period: Early Departure
 *    - If check-out is within grace period of work end: Present
 *    - Grace period considered when enabled
 */
class AttendanceLogic
{
    /**
     * Calculate attendance status based on policy and check-in/out times
     *
     * @param Employee $employee
     * @param Attendance $attendance
     * @return string The calculated status
     */
    public function calculateStatus(Employee $employee, Attendance $attendance): string
    {
        $policy = $employee->policy;

        // If no policy or policy is inactive today, return present as default
        // Use today's date to apply current active policy to all historical records
        if (!$policy || !$this->isPolicyActive($policy, Carbon::today())) {
            return 'present';
        }

        // If no check-in, can't determine status properly
        if (!$attendance->check_in) {
            return 'present';
        }

        $status = 'present';
        $isLate = false;

        // Step 1: Check for late arrival - this is preserved throughout
        if ($policy->enable_late_tracking) {
            $isLate = $this->isLateArrival($policy, $attendance);
            if ($isLate) {
                $status = 'late';
            }
        }

        // Step 2: If we have check-out time, calculate work duration and classify
        if ($attendance->check_out) {
            $totalMinutesWorked = $this->calculateWorkMinutes($attendance, $policy);
            $durationStatus = $this->classifyByWorkDuration($policy, $totalMinutesWorked, $attendance);

            // Only override late status if duration indicates absent or half_day
            // Otherwise, preserve the late status
            if ($durationStatus === 'absent' || $durationStatus === 'half_day') {
                $status = $durationStatus;
            } elseif (!$isLate) {
                // If not late, apply duration-based status (early_departure or present)
                $status = $durationStatus;
            }
            // If late and duration is full/present, keep late status
        }

        return $status;
    }

    /**
     * Check if an employee was late on arrival
     *
     * @param \App\Models\Policy $policy
     * @param Attendance $attendance
     * @return bool True if late, false if on time
     */
    public function isLateArrival($policy, Attendance $attendance): bool
    {
        // Use the attendance date to ensure proper time comparison
        $attendanceDate = Carbon::parse($attendance->date);
        
        // Create work start time on the attendance date (not today)
        $workStartTime = Carbon::createFromFormat(
            'Y-m-d H:i:s',
            $attendanceDate->format('Y-m-d') . ' ' . $policy->work_start_time
        );
        
        $gracePeriod = $policy->late_grace_period ?? 0;
        $allowedCheckInTime = $workStartTime->copy()->addMinutes($gracePeriod);
        $checkInTime = Carbon::parse($attendance->check_in);

        return $checkInTime->greaterThan($allowedCheckInTime);
    }

    /**
     * Calculate total work minutes from attendance record
     *
     * @param Attendance $attendance
     * @param \App\Models\Policy $policy
     * @return int Total minutes worked
     */
    public function calculateWorkMinutes(Attendance $attendance, $policy): int
    {
        if (!$attendance->check_in || !$attendance->check_out) {
            return 0;
        }

        $checkInTime = Carbon::parse($attendance->check_in);
        $checkOutTime = Carbon::parse($attendance->check_out);

        // Total elapsed time between check-in and check-out
        $totalElapsedMinutes = $checkOutTime->diffInMinutes($checkInTime, absolute: true);

        // If policy includes break time in calculation, return total elapsed
        if ($policy->include_break) {
            return $totalElapsedMinutes;
        }

        // Otherwise, subtract break time
        $breakMinutes = 0;
        if ($attendance->breaks && $attendance->breaks->count() > 0) {
            foreach ($attendance->breaks as $breakRecord) {
                if ($breakRecord->break_start && $breakRecord->break_end) {
                    $breakStart = Carbon::parse($breakRecord->break_start);
                    $breakEnd = Carbon::parse($breakRecord->break_end);
                    $breakMinutes += $breakEnd->diffInMinutes($breakStart, absolute: true);
                }
            }
        }

        return max(0, $totalElapsedMinutes - $breakMinutes);
    }

    /**
     * Classify attendance status based on work duration and early departure
     *
     * Rules:
     * - Less than half day: Absent
     * - Half day to one hour less than full day minus grace periods: Half Day
     * - One hour before full day minus grace periods or more: Present (or Early Departure based on checkout time)
     *
 * Early Departure Logic:
 * - Check only the checkout time against the range: (work_end_time - 1 hour) to (work_end_time - grace_period)
 * - If check-out is in this range: Early Departure
 * - Otherwise: Present
     *
     * @param \App\Models\Policy $policy
     * @param int $totalMinutesWorked
     * @param Attendance $attendance
     * @return string Status (absent, half_day, present, or early_departure)
     */
    public function classifyByWorkDuration($policy, int $totalMinutesWorked, Attendance $attendance): string
    {
        $halfDayMinutes = ($policy->half_day_hours * 60) + $policy->half_day_minutes;
        $fullDayMinutes = ($policy->full_day_hours * 60) + $policy->full_day_minutes;
        $graceMinutes = ($policy->early_grace_period ?? 0);
        $oneHourLessFullDay = $fullDayMinutes - 60 ;

        // Rule 1: Less than half day = Absent
        if ($totalMinutesWorked < $halfDayMinutes) {
            return 'absent';
        }

        // Rule 2: Half day to one hour less than full day = Half Day
        if ($totalMinutesWorked >= $halfDayMinutes && $totalMinutesWorked < $oneHourLessFullDay) {
            return 'half_day';
        }

        // Rule 3: One hour before full day or more - classify as present or early departure
        if ($totalMinutesWorked >= $oneHourLessFullDay) {
            // Check for early departure based on checkout time only (if enabled)
            if ($policy->enable_early_tracking && $attendance->check_out) {
                // Use the attendance date to ensure proper time comparison
                $attendanceDate = Carbon::parse($attendance->date);

                // Create work end time on the attendance date
                $workEndTime = Carbon::createFromFormat(
                    'Y-m-d H:i:s',
                    $attendanceDate->format('Y-m-d') . ' ' . $policy->work_end_time
                );

                $checkOutTime = Carbon::parse($attendance->check_out);
                $gracePeriod = $policy->early_grace_period ?? 0;

                // Calculate the range: between (work_end - 1 hour) and (work_end - grace_period)
                $oneHourBeforeEnd = $workEndTime->copy()->subHours(1);
                $graceBeforeEnd = $workEndTime->copy()->subMinutes($gracePeriod);

                // If check-out is in the last hour before work end but before grace period, it's early departure
                if ($checkOutTime->gte($oneHourBeforeEnd) && $checkOutTime->lt($graceBeforeEnd)) {
                    return 'early_departure';
                }
            }

            return 'present';
        }

        return 'present';
    }

    /**
     * Check if a policy is active on a given date
     *
     * @param \App\Models\Policy $policy
     * @param mixed $date
     * @return bool
     */
    public function isPolicyActive($policy, $date): bool
    {
        $date = Carbon::parse($date);

        $isAfterEffectiveFrom = is_null($policy->effective_from) || $date->gte(Carbon::parse($policy->effective_from));
        $isBeforeEffectiveTo = is_null($policy->effective_to) || $date->lte(Carbon::parse($policy->effective_to));

        return $isAfterEffectiveFrom && $isBeforeEffectiveTo;
    }

    /**
     * Get formatted work duration string
     *
     * @param int $totalMinutes
     * @return string Formatted as "Xh Ym"
     */
    public function formatWorkDuration(int $totalMinutes): string
    {
        $hours = floor($totalMinutes / 60);
        $minutes = $totalMinutes % 60;
        return "{$hours}h {$minutes}m";
    }

    /**
     * Get total work hours and minutes as arrays
     *
     * @param int $totalMinutes
     * @return array ['hours' => int, 'minutes' => int]
     */
    public function getWorkDurationParts(int $totalMinutes): array
    {
        return [
            'hours' => floor($totalMinutes / 60),
            'minutes' => $totalMinutes % 60,
        ];
    }
}
