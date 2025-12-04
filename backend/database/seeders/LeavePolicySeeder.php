<?php

namespace Database\Seeders;

use App\Models\LeavePolicy;
use Illuminate\Database\Seeder;

class LeavePolicySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $policies = [
            [
                'name' => 'Casual Leave',
                'code' => 'CL',
                'description' => 'Casual leave with monthly accrual.',
                'yearly_quota' => 12,
                'monthly_accrual_value' => 1,
                'accrual_day_of_month' => 1,
                'annual_maximum' => 12,
                'carry_forward_allowed' => true,
                'carry_forward_max_per_quarter' => 3,
                'carry_forward_reset_frequency' => 'QUARTERLY',
                'carry_forward_auto_reset_enabled' => true,
                'reset_notice_days' => 3,
                'sandwich_rule_enabled' => true,
                'is_active' => true,
                'max_balance' => 12,
            ],
            [
                'name' => 'Sick Leave',
                'code' => 'SL',
                'description' => 'Medical leave; documentation required for 1+ days.',
                'yearly_quota' => 12,
                'monthly_accrual_value' => 1,
                'accrual_day_of_month' => 1,
                'annual_maximum' => 12,
                'carry_forward_allowed' => false,
                'carry_forward_max_per_quarter' => 0,
                'carry_forward_reset_frequency' => 'QUARTERLY',
                'carry_forward_auto_reset_enabled' => true,
                'reset_notice_days' => 3,
                'sandwich_rule_enabled' => false,
                'is_active' => true,
                'max_balance' => 12,
            ],
            [
                'name' => 'Earned Leave',
                'code' => 'EL',
                'description' => 'Earned leave with carry forward for one quarter only.',
                'yearly_quota' => 12,
                'carry_forward_enabled' => true,
                'carry_forward_quarter_cap' => 3,
                'carry_forward_reset_mode' => 'quarterly',
                'auto_reset_quarter_end' => true,
                'reset_notice_days' => 3,
                'sandwich_rule_enabled' => true,
                'is_active' => true,
                'max_balance' => 18,
            ],
        ];

        foreach ($policies as $policy) {
            LeavePolicy::firstOrCreate(
                ['code' => $policy['code']],
                $policy
            );
        }
    }
}

