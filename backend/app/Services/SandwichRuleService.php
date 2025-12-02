<?php

namespace App\Services;

use App\Models\Holiday;
use Carbon\Carbon;

class SandwichRuleService
{
    public function calculateSandwichDays(Carbon $fromDate, Carbon $toDate, array $holidays = []): int
    {
        $sandwichDays = 0;
        $currentDate = $fromDate->copy();

        while ($currentDate->lte($toDate)) {
            if ($this->isWeekend($currentDate) || $this->isHoliday($currentDate, $holidays)) {
                $sandwichDays++;
            }
            $currentDate->addDay();
        }

        return $sandwichDays;
    }

    public function applySandwichRule(Carbon $fromDate, Carbon $toDate, array $holidays = []): array
    {
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
        $extended = $date->copy();
        while ($this->isWeekend($extended) || $this->isHoliday($extended, $holidays)) {
            $extended->subDay();
        }
        return $extended;
    }

    private function findExtendedEnd(Carbon $date, array $holidays): Carbon
    {
        $extended = $date->copy();
        while ($this->isWeekend($extended) || $this->isHoliday($extended, $holidays)) {
            $extended->addDay();
        }
        return $extended;
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
