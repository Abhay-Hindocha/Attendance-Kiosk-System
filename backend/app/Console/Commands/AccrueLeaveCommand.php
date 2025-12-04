<?php

namespace App\Console\Commands;

use App\Services\LeaveService;
use App\Services\LeaveAccrualService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class AccrueLeaveCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leave:accrue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Accrue monthly leaves and process carry forward at quarter end';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $accrualService = app(LeaveAccrualService::class);
        $today = now();

        // Always accrue monthly leaves
        $this->info('Accruing monthly leaves...');
        $accrualService->runMonthlyAccrual($today);

        // Check if it's quarter end (months 3,6,9,12)
        $currentMonth = $today->month;
        if (in_array($currentMonth, [3, 6, 9, 12])) {
            $this->info('Processing carry forward at quarter end...');
            $accrualService->runQuarterEndProcess($today);
        }

        // Check for notifications before quarter end
        $accrualService->sendPreResetNotifications($today);

        $this->info('Leave accrual completed.');
    }

    /**
     * Send notifications before quarter end based on reset_notice_days
     */
    private function sendQuarterEndNotifications(LeaveService $leaveService, Carbon $today)
    {
        // Define quarter end months and their end dates
        $quarterEnds = [
            3 => Carbon::create($today->year, 3, 31),
            6 => Carbon::create($today->year, 6, 30),
            9 => Carbon::create($today->year, 9, 30),
            12 => Carbon::create($today->year, 12, 31),
        ];

        // Get policies that need notifications
        $policies = \App\Models\LeavePolicy::where('carry_forward_allowed', true)
            ->where('carry_forward_reset_frequency', 'QUARTERLY')
            ->where('is_active', true)
            ->where('reset_notice_days', '>', 0)
            ->get();

        foreach ($policies as $policy) {
            foreach ($quarterEnds as $month => $endDate) {
                $noticeDate = $endDate->copy()->subDays($policy->reset_notice_days);

                if ($today->isSameDay($noticeDate)) {
                    $this->info("Sending notifications for policy '{$policy->name}' quarter end in month {$month}...");
                    // TODO: Implement actual notification logic (email, in-app notification, etc.)
                    // $this->notifyEmployees($policy, $month, $endDate);
                }
            }
        }
    }
}
