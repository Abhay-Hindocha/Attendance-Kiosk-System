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
                'monthly_accrual' => 1,
                'accrual_day' => 1,
                'join_date_proration' => true,
                'carry_forward_enabled' => true,
                'carry_forward_quarter_cap' => 3,
                'carry_forward_reset_mode' => 'quarterly',
                'auto_reset_quarter_end' => true,
                'reset_notice_days' => 3,
                'sandwich_rule_enabled' => true,
                'sandwich_examples' => [
                    'Leave Fri + Mon → Sat & Sun counted',
                    'Leave Wed + Fri with Thu holiday → Wed, Thu, Fri counted',
                ],
                'status' => 'active',
                'max_balance' => 12,
            ],
            [
                'name' => 'Sick Leave',
                'code' => 'SL',
                'description' => 'Medical leave; documentation required for 1+ days.',
                'yearly_quota' => 12,
                'monthly_accrual' => 1,
                'accrual_day' => 1,
                'join_date_proration' => true,
                'carry_forward_enabled' => false,
                'carry_forward_quarter_cap' => 0,
                'carry_forward_reset_mode' => 'quarterly',
                'auto_reset_quarter_end' => true,
                'reset_notice_days' => 3,
                'sandwich_rule_enabled' => false,
                'status' => 'active',
                'max_balance' => 12,
            ],
            [
                'name' => 'Earned Leave',
                'code' => 'EL',
                'description' => 'Earned leave with carry forward for one quarter only.',
                'yearly_quota' => 12,
                'monthly_accrual' => 1,
                'accrual_day' => 1,
                'join_date_proration' => true,
                'carry_forward_enabled' => true,
                'carry_forward_quarter_cap' => 3,
                'carry_forward_reset_mode' => 'quarterly',
                'auto_reset_quarter_end' => true,
                'reset_notice_days' => 3,
                'sandwich_rule_enabled' => true,
                'status' => 'active',
                'max_balance' => 18,
            ],
        ];

        foreach ($policies as $policy) {
            LeavePolicy::firstOrCreate(
                ['code' => $policy['code']],
                $policy + ['last_updated_at' => now()]
            );
        }
    }
}

