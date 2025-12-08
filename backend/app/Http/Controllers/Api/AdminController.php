<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceCorrectionRequest;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AdminController extends Controller
{
    public function listCorrectionRequests(Request $request)
    {
        $status = $request->input('status', 'pending');

        $query = AttendanceCorrectionRequest::with(['employee', 'attendance'])->whereHas('employee');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $requests = $query->orderByDesc('created_at')
            ->get()
            ->map(function ($request) {
                $employee = $request->employee;
                if (!$employee) {
                    return null;
                }
                return [
                    'id' => $request->id,
                    'employee' => [
                        'id' => $employee->id,
                        'name' => $employee->name,
                        'employee_id' => $employee->employee_id,
                    ],
                    'type' => $request->type,
                    'requested_check_in' => $request->requested_check_in ? $request->requested_check_in->format('H:i') : null,
                    'requested_check_out' => $request->requested_check_out ? $request->requested_check_out->format('H:i') : null,
                    'reason' => $request->reason,
                    'status' => $request->status,
                    'submitted_at' => $request->created_at->toDateString(),
                    'attendance' => $request->attendance ? [
                        'id' => $request->attendance->id,
                        'date' => $request->attendance->date,
                        'check_in' => $request->attendance->check_in ? $request->attendance->check_in->format('H:i') : null,
                        'check_out' => $request->attendance->check_out ? $request->attendance->check_out->format('H:i') : null,
                    ] : null,
                ];
            })
            ->filter(function ($request) {
                return $request !== null;
            })
            ->values();

        return response()->json(['requests' => $requests]);
    }

    public function approveCorrectionRequest(Request $request, $id)
    {
        $admin = $request->user();
        $correctionRequest = AttendanceCorrectionRequest::findOrFail($id);

        if ($correctionRequest->status !== 'pending') {
            return response()->json(['message' => 'Request has already been processed'], 400);
        }

        if ($correctionRequest->type === 'missing') {
            // Create new attendance record
            Attendance::create([
                'employee_id' => $correctionRequest->employee_id,
                'date' => Carbon::parse($correctionRequest->requested_check_in)->toDateString(),
                'check_in' => $correctionRequest->requested_check_in,
                'check_out' => $correctionRequest->requested_check_out,
                'status' => 'present', // Will be recalculated by AttendanceLogic
            ]);
        } else {
            // Update existing attendance
            $attendance = $correctionRequest->attendance;
            if ($correctionRequest->type === 'wrong_checkin') {
                $attendance->update(['check_in' => $correctionRequest->requested_check_in]);
            } elseif ($correctionRequest->type === 'wrong_checkout') {
                $attendance->update(['check_out' => $correctionRequest->requested_check_out]);
            }
        }

        $correctionRequest->update([
            'status' => 'approved',
            'admin_id' => $admin->id,
            'approved_at' => now(),
        ]);

        // Log the action
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'approved_correction_request',
            'model_type' => 'AttendanceCorrectionRequest',
            'model_id' => $correctionRequest->id,
            'old_values' => json_encode(['status' => 'pending']),
            'new_values' => json_encode(['status' => 'approved']),
            'ip_address' => $request->ip(),
        ]);

        // Send email notification
        if ($correctionRequest->employee->email) {
            Mail::to($correctionRequest->employee->email)->send(new AttendanceCorrectionRequestMail($correctionRequest, 'approved'));
        }

        return response()->json(['message' => 'Correction request approved successfully']);
    }

    public function rejectCorrectionRequest(Request $request, $id)
    {
        $admin = $request->user();
        $correctionRequest = AttendanceCorrectionRequest::findOrFail($id);

        if ($correctionRequest->status !== 'pending') {
            return response()->json(['message' => 'Request has already been processed'], 400);
        }

        $correctionRequest->update([
            'status' => 'rejected',
            'admin_id' => $admin->id,
            'rejected_at' => now(),
        ]);

        // Log the action
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'rejected_correction_request',
            'model_type' => 'AttendanceCorrectionRequest',
            'model_id' => $correctionRequest->id,
            'old_values' => json_encode(['status' => 'pending']),
            'new_values' => json_encode(['status' => 'rejected']),
            'ip_address' => $request->ip(),
        ]);

        // Send email notification
        if ($correctionRequest->employee->email) {
            Mail::to($correctionRequest->employee->email)->send(new AttendanceCorrectionRequestMail($correctionRequest, 'rejected'));
        }

        return response()->json(['message' => 'Correction request rejected successfully']);
    }

    public function getCorrectionRequests(Request $request)
    {
        $employee = $request->user();

        $requests = AttendanceCorrectionRequest::where('employee_id', $employee->id)
            ->with('attendance')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($request) {
                return [
                    'id' => $request->id,
                    'type' => $request->type,
                    'requested_check_in' => $request->requested_check_in ? Carbon::parse($request->requested_check_in)->format('H:i') : null,
                    'requested_check_out' => $request->requested_check_out ? Carbon::parse($request->requested_check_out)->format('H:i') : null,
                    'reason' => $request->reason,
                    'status' => $request->status,
                    'submitted_at' => $request->created_at->toDateString(),
                    'processed_at' => $request->approved_at ?? $request->rejected_at,
                    'attendance' => $request->attendance ? [
                        'id' => $request->attendance->id,
                        'date' => $request->attendance->date,
                        'check_in' => $request->attendance->check_in ? $request->attendance->check_in->format('H:i') : null,
                        'check_out' => $request->attendance->check_out ? $request->attendance->check_out->format('H:i') : null,
                    ] : null,
                ];
            });

        return response()->json(['requests' => $requests]);
    }

    public function manualCheckIn(Request $request)
    {
        $admin = $request->user();

        $data = $request->validate([
            'employee_id' => 'required|exists:employees,employee_id',
            'date' => 'required|date',
            'time' => 'required|date_format:H:i',
            'reason' => 'required|string|max:500',
        ]);

        // Find the employee by employee_id to get the primary key
        $employee = \App\Models\Employee::where('employee_id', $data['employee_id'])->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        $checkInDateTime = Carbon::createFromFormat('Y-m-d H:i', $data['date'] . ' ' . $data['time']);

        $attendance = Attendance::firstOrCreate(
            [
                'employee_id' => $employee->id,
                'date' => $data['date'],
            ],
            [
                'check_in' => $checkInDateTime->toDateTimeString(),
                'status' => 'present',
            ]
        );

        if ($attendance->wasRecentlyCreated) {
            // Log the action
            AuditLog::create([
                'user_id' => $admin->id,
                'action' => 'manual_check_in',
                'model_type' => 'Attendance',
                'model_id' => $attendance->id,
                'new_values' => json_encode([
                    'employee_id' => $data['employee_id'],
                    'date' => $data['date'],
                    'check_in' => $data['time'],
                    'reason' => $data['reason']
                ]),
                'ip_address' => $request->ip(),
            ]);
        } else {
            // Update existing attendance
            $oldValues = [
                'check_in' => $attendance->check_in ? $attendance->check_in->format('H:i') : null,
            ];

            $attendance->update([
                'check_in' => $checkInDateTime->toDateTimeString(),
            ]);

            AuditLog::create([
                'user_id' => $admin->id,
                'action' => 'manual_check_in_update',
                'model_type' => 'Attendance',
                'model_id' => $attendance->id,
                'old_values' => json_encode($oldValues),
                'new_values' => json_encode([
                    'check_in' => $data['time'],
                    'reason' => $data['reason']
                ]),
                'ip_address' => $request->ip(),
            ]);
        }

        return response()->json([
            'message' => 'Manual check-in recorded successfully',
            'attendance' => $attendance
        ]);
    }

    public function manualCheckOut(Request $request)
    {
        $admin = $request->user();

        $data = $request->validate([
            'employee_id' => 'required|exists:employees,employee_id',
            'date' => 'required|date',
            'time' => 'required|date_format:H:i',
            'reason' => 'required|string|max:500',
        ]);

        // Find the employee by employee_id to get the primary key
        $employee = \App\Models\Employee::where('employee_id', $data['employee_id'])->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $data['date'])
            ->first();

        if (!$attendance) {
            return response()->json(['message' => 'No attendance record found for this date'], 404);
        }

        $oldValues = [
            'check_out' => $attendance->check_out ? $attendance->check_out->format('H:i') : null,
        ];

        $checkOutDateTime = Carbon::createFromFormat('Y-m-d H:i', $data['date'] . ' ' . $data['time']);

        $attendance->update([
            'check_out' => $checkOutDateTime->toDateTimeString(),
        ]);

        // Log the action
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'manual_check_out',
            'model_type' => 'Attendance',
            'model_id' => $attendance->id,
            'old_values' => json_encode($oldValues),
            'new_values' => json_encode([
                'check_out' => $data['time'],
                'reason' => $data['reason']
            ]),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Manual check-out recorded successfully',
            'attendance' => $attendance
        ]);
    }

    public function editAttendance(Request $request, $id)
    {
        $admin = $request->user();
        $attendance = Attendance::findOrFail($id);

        $data = $request->validate([
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'reason' => 'required|string|max:500',
        ]);

        $oldValues = [
            'check_in' => $attendance->check_in ? $attendance->check_in->format('H:i') : null,
            'check_out' => $attendance->check_out ? $attendance->check_out->format('H:i') : null,
        ];

        $updates = [];
        if (isset($data['check_in'])) {
            $checkInDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date . ' ' . $data['check_in']);
            $updates['check_in'] = $checkInDateTime->toDateTimeString();
        }
        if (isset($data['check_out'])) {
            $checkOutDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date . ' ' . $data['check_out']);
            $updates['check_out'] = $checkOutDateTime->toDateTimeString();
        }

        $attendance->update($updates);

        // Log the action
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'edit_attendance',
            'model_type' => 'Attendance',
            'model_id' => $attendance->id,
            'old_values' => json_encode($oldValues),
            'new_values' => json_encode(array_merge($updates, ['reason' => $data['reason']])),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Attendance record updated successfully',
            'attendance' => $attendance
        ]);
    }
}
