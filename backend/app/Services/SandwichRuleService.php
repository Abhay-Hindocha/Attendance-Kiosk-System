<?php

namespace App\Services;

use App\Models\Holiday;
use App\Models\LeavePolicy;
use Carbon\Carbon;

class SandwichRuleService
{
    public function calculateSandwichDays(Carbon $fromDate, Carbon $toDate, array $holidays = []): int
    {
        $sandwichDays = 0;
        $currentDate = $fromDate->copy();

        while ($currentDate->lte($toDate)) {
            if ($this->isWeekend($currentDate)) {
                $sandwichDays++;
            }
            $currentDate->addDay();
        }

        return $sandwichDays;
    }

    public function applySandwichRule(LeavePolicy $policy, Carbon $fromDate, Carbon $toDate, ?int $employeeId = null, float $baseDays = 0): array
    {
        if (!$policy->sandwich_rule_enabled) {
            return [
                'original_from' => $fromDate,
                'original_to' => $toDate,
                'extended_from' => $fromDate,
                'extended_to' => $toDate,
                'total_days' => $fromDate->diffInDays($toDate) + 1,
                'sandwich_days' => 0,
                'effective_days' => $baseDays ?: ($fromDate->diffInDays($toDate) + 1),
            ];
        }

        $holidays = $this->getHolidaysForYear($fromDate->year);

        // Default range is the request itself
        // But we must "Trim" it to the actual working days.
        // If I ask for 24-25 (where 25 is Hol), the effective "bridge" attempt is only from 24 to 24.
        $realFrom = $fromDate->copy();
        while ($realFrom->lte($toDate) && ($this->isWeekend($realFrom) || $this->isHoliday($realFrom, $holidays))) {
            $realFrom->addDay();
        }

        $realTo = $toDate->copy();
        while ($realTo->gte($fromDate) && ($this->isWeekend($realTo) || $this->isHoliday($realTo, $holidays))) {
            $realTo->subDay();
        }

        if ($realFrom->gt($realTo)) {
            // The entire range is holidays/weekends. No sandwich can be formed initiated by this.
            \Log::info("SandwichRule: Entire range is non-working. No sandwich.");
            return [
                'original_from' => $fromDate,
                'original_to' => $toDate,
                'extended_from' => $fromDate,
                'extended_to' => $toDate,
                'total_days' => 0,
                'sandwich_days' => 0,
                'effective_days' => 0,
            ];
        }

        $extendedFrom = $realFrom->copy();
        $extendedTo = $realTo->copy();
        $adjacentLeavesCost = 0;

        // Use realFrom/realTo for adjacency checks
        $fromDate = $realFrom;
        $toDate = $realTo;

        if ($employeeId) {
            // Find adjacent leaves
            $adjacents = $this->findAdjacentLeaves($fromDate, $toDate, $employeeId, $holidays);
            \Log::info("SandwichRule: Finding adjacents for ID $employeeId. Found: " . $adjacents->count());

            if ($adjacents->isNotEmpty()) {
                // Determine the union range
                $minDate = $adjacents->min('from_date');
                $maxDate = $adjacents->max('to_date');

                // Compare with current request dates
                $fullStart = Carbon::parse($minDate)->lt($fromDate) ? Carbon::parse($minDate) : $fromDate;
                $fullEnd = Carbon::parse($maxDate)->gt($toDate) ? Carbon::parse($maxDate) : $toDate;

                // Find effective extended start/end considering holidays outside the range
                $extendedFrom = $this->findExtendedStart($fullStart, $holidays);
                $extendedTo = $this->findExtendedEnd($fullEnd, $holidays);

                // Sum cost of adjacent leaves
                $adjacentLeavesCost = $adjacents->sum('total_days');
                \Log::info("SandwichRule: Adjacents found. Extended: {$extendedFrom->toDateString()} to {$extendedTo->toDateString()}. Adjacents cost: $adjacentLeavesCost");
            } else {
                \Log::info("SandwichRule: No adjacents. NOT extending.");
                $extendedFrom = $fromDate->copy();
                $extendedTo = $toDate->copy();
            }
        } else {
            \Log::info("SandwichRule: No employee ID provided.");
            // No adjacents or no employee ID: Do NOT extend blindly.
            // Sandwich rule only applies if we BRIDGE something.
            // If strictly inside a week, we don't charge weekends.
            $extendedFrom = $fromDate->copy();
            $extendedTo = $toDate->copy();
        }

        // Calculate total days in the full continuous block (this is the "Sandwich Charge" principle: 
        // if you span it, you pay for all days in between)
        $totalBlockDays = $extendedFrom->diffInDays($extendedTo) + 1;

        // The cost for THIS request is the Total Block Cost minus what was already paid by neighbors
        $thisRequestTotalCost = max(0, $totalBlockDays - $adjacentLeavesCost);

        // If baseDays is 0 (or not provided), fallback to raw diff (though this should be avoided)
        // Ensure effectiveDayCount >= 0
        $effectiveDayCount = $baseDays > 0 ? $baseDays : ($fromDate->diffInDays($toDate) + 1);

        // Sandwich delta
        $sandwichDays = max(0, $thisRequestTotalCost - $effectiveDayCount);

        \Log::info("SandwichRule: Calculation", [
            'from' => $fromDate->toDateString(),
            'to' => $toDate->toDateString(),
            'extendedFrom' => $extendedFrom->toDateString(),
            'extendedTo' => $extendedTo->toDateString(),
            'totalBlock' => $totalBlockDays,
            'thisCost' => $thisRequestTotalCost,
            'effective' => $effectiveDayCount,
            'sandwich' => $sandwichDays
        ]);

        return [
            'original_from' => $fromDate,
            'original_to' => $toDate,
            'extended_from' => $extendedFrom,
            'extended_to' => $extendedTo,
            'total_days' => $thisRequestTotalCost,
            'sandwich_days' => $sandwichDays,
            'effective_days' => $effectiveDayCount,
        ];
    }

    private function findAdjacentLeaves(Carbon $fromDate, Carbon $toDate, int $employeeId, array $holidays): \Illuminate\Support\Collection
    {
        $leaves = collect([]);

        // Backward search
        $checkDate = $fromDate->copy()->subDay();
        while (true) {
            // Skip non-working days
            if ($this->isWeekend($checkDate) || $this->isHoliday($checkDate, $holidays)) {
                $checkDate->subDay();
                continue;
            }

            // Check for leave ending on this working day
            $adjacent = \App\Models\LeaveRequest::where('employee_id', $employeeId)
                ->where('status', 'approved')
                ->where('to_date', $checkDate->toDateString())
                ->first();

            if ($adjacent) {
                $leaves->push($adjacent);
                // Move checkDate to before this leave to continue searching
                $checkDate = Carbon::parse($adjacent->from_date)->subDay();
            } else {
                break;
            }
        }

        // Forward search
        $checkDate = $toDate->copy()->addDay();
        while (true) {
            if ($this->isWeekend($checkDate) || $this->isHoliday($checkDate, $holidays)) {
                $checkDate->addDay();
                continue;
            }

            $adjacent = \App\Models\LeaveRequest::where('employee_id', $employeeId)
                ->where('status', 'approved')
                ->where('from_date', $checkDate->toDateString())
                ->first();

            if ($adjacent) {
                $leaves->push($adjacent);
                $checkDate = Carbon::parse($adjacent->to_date)->addDay();
            } else {
                break;
            }
        }

        return $leaves;
    }

    private function findExtendedStart(Carbon $date, array $holidays): Carbon
    {
        $extended = $date->copy()->subDay();
        while ($this->isWeekend($extended)) {
            $extended->subDay();
        }
        return $extended->addDay();
    }

    private function findExtendedEnd(Carbon $date, array $holidays): Carbon
    {
        $extended = $date->copy()->addDay();
        while ($this->isWeekend($extended)) {
            $extended->addDay();
        }
        return $extended->subDay();
    }

    private function isWeekend(Carbon $date): bool
    {
        return $date->isWeekend();
    }

    private function isHoliday(Carbon $date, array $holidays): bool
    {
        return in_array($date->toDateString(), $holidays);
    }

    public function getHolidaysForYear(int $year): array
    {
        return Holiday::whereYear('date', $year)
            ->pluck('date')
            ->map(fn($date) => Carbon::parse($date)->toDateString())
            ->toArray();
    }
}
