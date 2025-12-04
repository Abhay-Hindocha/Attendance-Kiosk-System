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

    public function applySandwichRule(LeavePolicy $policy, Carbon $fromDate, Carbon $toDate): array
    {
        if (!$policy->sandwich_rule_enabled) {
            return [
                'original_from' => $fromDate,
                'original_to' => $toDate,
                'extended_from' => $fromDate,
                'extended_to' => $toDate,
                'total_days' => $fromDate->diffInDays($toDate) + 1,
                'sandwich_days' => 0,
                'effective_days' => $fromDate->diffInDays($toDate) + 1,
            ];
        }

        $holidays = $this->getHolidaysForYear($fromDate->year);
        $extendedFrom = $this->findExtendedStart($fromDate, $holidays);
        $extendedTo = $this->findExtendedEnd($toDate, $holidays);

        $totalDays = $extendedFrom->diffInDays($extendedTo) + 1;
        $sandwichDays = $this->calculateSandwichDays($extendedFrom, $extendedTo, $holidays);

        return [
            'original_from' => $fromDate,
            'original_to' => $toDate,
            'extended_from' => $extendedFrom,
            'extended_to' => $extendedTo,
            'total_days' => $totalDays,
            'sandwich_days' => $sandwichDays,
            'effective_days' => $totalDays - $sandwichDays,
        ];
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
            ->map(fn($date) => $date->toDateString())
            ->toArray();
    }
}
