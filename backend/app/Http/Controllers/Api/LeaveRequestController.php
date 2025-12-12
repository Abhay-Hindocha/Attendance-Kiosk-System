<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveBalance;
use App\Models\LeavePolicy;
use App\Models\LeaveRequest;
use App\Models\LeaveRequestTimeline;
use App\Services\SandwichRuleService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;
use App\Mail\LeaveRequestSubmittedMail;
use App\Models\Admin;

class LeaveRequestController extends Controller
{
    protected $sandwichRuleService;

    public function __construct(SandwichRuleService $sandwichRuleService)
    {
        $this->sandwichRuleService = $sandwichRuleService;
    }

    public function index(Request $request)
    {
        $query = LeaveRequest::with(['employee:id,name,department', 'policy:id,name,code'])
            ->orderByDesc('created_at');

        $user = $request->user();

        if ($user instanceof Employee) {
            $query->where('employee_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('leave_policy_id')) {
            $query->where('leave_policy_id', $request->integer('leave_policy_id'));
        }

        if ($request->filled('employee_id') && !($user instanceof Employee)) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->where(function ($q) use ($request) {
                $q->whereBetween('from_date', [$request->date('start_date'), $request->date('end_date')])
                    ->orWhereBetween('to_date', [$request->date('start_date'), $request->date('end_date')]);
            });
        }

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => ['nullable', 'exists:employees,id'],
            'leave_policy_id' => ['required', 'exists:leave_policies,id'],
            'from_date' => ['required', 'date', 'before_or_equal:to_date'],
            'to_date' => ['required', 'date'],
            'partial_day' => ['nullable', Rule::in(['full_day', 'half_day'])],
            'partial_session' => ['nullable', Rule::in(['first_half', 'second_half', 'custom'])],
            'reason' => ['nullable', 'string'],
            'conflict_checks' => ['nullable', 'array'],
            'attachment' => ['nullable', 'file', 'max:4096'],
        ]);

        $requestingUser = $request->user();

        if ($requestingUser instanceof Employee) {
            $data['employee_id'] = $requestingUser->id;
        }

        if (empty($data['employee_id'])) {
            return response()->json(['error' => 'Employee is required.'], 422);
        }

        $employee = Employee::findOrFail($data['employee_id']);

        if ($requestingUser instanceof Employee && $employee->id !== $requestingUser->id) {
            abort(403, 'You cannot submit leave for another employee.');
        }
        $policy = LeavePolicy::findOrFail($data['leave_policy_id']);

        $fromDate = Carbon::parse($data['from_date'])->startOfDay();
        $toDate = Carbon::parse($data['to_date'])->startOfDay();
        $partialDay = $data['partial_day'] ?? 'full_day';
        $isPartial = $partialDay === 'half_day';
        $holidays = $this->sandwichRuleService->getHolidaysForYear($fromDate->year);
        $estimatedDays = $this->calculateEstimatedDays($fromDate, $toDate, $isPartial, $data['partial_session'] ?? null, $holidays);

        $sandwichResult = $this->sandwichRuleService->applySandwichRule($policy, $fromDate, $toDate);
        $sandwichDays = $sandwichResult['sandwich_days'];
        $totalDays = $estimatedDays + $sandwichDays;

        $requiresDocument = $this->shouldRequireDocument($policy, $totalDays);
        if ($requiresDocument && !$request->hasFile('attachment')) {
            return response()->json([
                'error' => 'Supporting document is required for this leave type and duration.',
            ], 422);
        }

        $overlaps = LeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'approved', 'clarification'])
            ->where(function ($q) use ($fromDate, $toDate) {
                $q->whereBetween('from_date', [$fromDate, $toDate])
                    ->orWhereBetween('to_date', [$fromDate, $toDate])
                    ->orWhere(function ($inner) use ($fromDate, $toDate) {
                        $inner->where('from_date', '<=', $fromDate)
                            ->where('to_date', '>=', $toDate);
                    });
            })
            ->exists();

        if ($overlaps) {
            return response()->json([
                'error' => 'Leave request overlaps with existing request.',
            ], 422);
        }

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('leave-documents', 'public');
        }

        $leaveRequest = DB::transaction(function () use (
            $employee,
            $policy,
            $totalDays,
            $estimatedDays,
            $sandwichDays,
            $partialDay,
            $data,
            $attachmentPath,
            $requiresDocument,
            $request
        ) {
            $balance = LeaveBalance::firstOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_policy_id' => $policy->id,
                ],
                [
                    'balance' => 0,
                    'carry_forward_balance' => 0,
                ]
            );

            $available = ($balance->balance + $balance->carry_forward_balance) - $balance->pending_deduction;
            if ($available < $totalDays) {
                throw ValidationException::withMessages([
                    'balance' => ['Insufficient leave balance.'],
                ]);
            }

            $balance->pending_deduction += $totalDays;
            $balance->save();

            $leaveRequest = LeaveRequest::create([
                'employee_id' => $employee->id,
                'leave_policy_id' => $policy->id,
                'leave_type' => $partialDay,
                'from_date' => $data['from_date'],
                'to_date' => $data['to_date'],
                'partial_day' => $partialDay,
                'partial_session' => $data['partial_session'] ?? null,
                'reason' => $data['reason'] ?? null,
                'status' => 'pending',
                'estimated_days' => $estimatedDays,
                'sandwich_applied_days' => $sandwichDays,
                'sandwich_rule_applied' => $sandwichDays > 0,
                'total_days' => $totalDays,
                'requires_document' => $requiresDocument,
                'attachment_path' => $attachmentPath,
                'conflict_checks' => $data['conflict_checks'] ?? null,
                'submitted_at' => now(),
            ]);

            LeaveRequestTimeline::create([
                'leave_request_id' => $leaveRequest->id,
                'action' => 'submitted',
                'notes' => 'Leave request submitted by employee.',
                'performed_by_type' => 'employee',
                'performed_by_id' => $employee->id,
            ]);

            return $leaveRequest;
        });

        // Send email notification to all admins
        $admins = Admin::all();
        foreach ($admins as $admin) {
            Mail::to($admin->email)->send(new LeaveRequestSubmittedMail($leaveRequest));
        }

        return response()->json($leaveRequest->load(['policy', 'employee']), 201);
    }

    public function show(Request $request, LeaveRequest $leaveRequest)
    {
        $user = $request->user();

        // Employees can only view their own leave requests
        if ($user instanceof Employee && $leaveRequest->employee_id !== $user->id) {
            abort(403, 'You can only view your own leave requests.');
        }

        $leaveRequest->load(['employee', 'policy', 'timelines' => fn ($q) => $q->orderBy('created_at')]);

        return response()->json($leaveRequest);
    }

    public function cancel(Request $request, LeaveRequest $leaveRequest)
    {
        $requestingUser = $request->user();

        if ($requestingUser instanceof Employee && $leaveRequest->employee_id !== $requestingUser->id) {
            abort(403, 'You cannot cancel this leave request.');
        }

        if ($leaveRequest->status !== 'pending') {
            return response()->json(['error' => 'Only pending requests can be cancelled.'], 422);
        }

        if (Carbon::now()->greaterThanOrEqualTo(Carbon::parse($leaveRequest->from_date))) {
            return response()->json(['error' => 'Cannot cancel leave on or after the start date.'], 422);
        }

        DB::transaction(function () use ($leaveRequest) {
            $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
                ->where('leave_policy_id', $leaveRequest->leave_policy_id)
                ->lockForUpdate()
                ->first();

            if ($balance) {
                $balance->pending_deduction = max(
                    0,
                    $balance->pending_deduction - ($leaveRequest->estimated_days + $leaveRequest->sandwich_applied_days)
                );
                $balance->save();
            }

            $leaveRequest->status = 'cancelled';
            $leaveRequest->cancelled_at = now();
            $leaveRequest->save();

            LeaveRequestTimeline::create([
                'leave_request_id' => $leaveRequest->id,
                'action' => 'cancelled',
                'notes' => 'Leave request cancelled by employee.',
                'performed_by_type' => 'employee',
                'performed_by_id' => $leaveRequest->employee_id,
            ]);
        });

        return response()->json(['message' => 'Leave request cancelled successfully.']);
    }

    /**
     * Download the stored attachment for the leave request (public disk)
     */
    public function download(Request $request, LeaveRequest $leaveRequest)
    {
        $user = null;
        
        // Try to get authenticated user from current session/headers
        if (auth('sanctum')->check()) {
            $user = auth('sanctum')->user();
        } elseif (auth('employee')->check()) {
            $user = auth('employee')->user();
        }
        
        // If no authenticated user, try to get from token query parameter
        if (!$user && $request->has('token')) {
            $token = $request->query('token');
            try {
                $personalAccessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                if ($personalAccessToken) {
                    $user = $personalAccessToken->tokenable;
                }
            } catch (\Exception $e) {
                // Token validation failed
            }
        }

        if (!$user) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        // Check if user can access this leave request
        if ($user instanceof Employee && $leaveRequest->employee_id !== $user->id) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        if (empty($leaveRequest->attachment_path)) {
            return response()->json(['error' => 'No attachment found.'], 404);
        }

        $disk = Storage::disk('public');
        if (!$disk->exists($leaveRequest->attachment_path)) {
            return response()->json(['error' => 'File not found.'], 404);
        }

        return $disk->download($leaveRequest->attachment_path);
    }

    protected function calculateEstimatedDays(
        Carbon $fromDate,
        Carbon $toDate,
        bool $isPartial,
        ?string $partialSession,
        array $holidays = []
    ): float {
        if ($isPartial) {
            return $partialSession === 'custom' ? 0.5 : 0.5;
        }

        $period = CarbonPeriod::create($fromDate, $toDate);
        return collect($period)->reduce(function ($carry, Carbon $date) use ($holidays) {
            if (!$date->isWeekend() && !in_array($date->toDateString(), $holidays)) {
                return $carry + 1;
            }
            return $carry;
        }, 0.0);
    }


    protected function shouldRequireDocument(LeavePolicy $policy, float $totalDays): bool
    {
        if ($policy->code === 'SL' && $totalDays >= 1) {
            return true;
        }

        return false;
    }
}
