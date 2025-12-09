<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AttendanceCorrectionRequestMail;
use App\Models\Attendance;
use App\Models\AttendanceCorrectionRequest;
use App\Models\AuditLog;
use App\Models\BreakRecord;
use App\Services\AttendanceLogic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;

class AdminController extends Controller
{
    private function parseTime($time)
    {
        if (empty($time)) {
            return null;
        }

        // If it's already in H:i format, return as is
        if (preg_match('/^\d{2}:\d{2}$/', $time)) {
            return $time;
        }

        // Try to parse as full datetime and extract H:i
        try {
            $parsed = Carbon::parse($time);
            return $parsed->format('H:i');
        } catch (\Exception $e) {
            // If parsing fails, return null
            return null;
        }
    }

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
                    'requested_breaks' => $request->requested_breaks,
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
        $correctionRequest = AttendanceCorrectionRequest::with(['employee', 'attendance'])->findOrFail($id);

        if ($correctionRequest->status !== 'pending') {
            return response()->json(['message' => 'Request has already been processed'], 400);
        }

        // Initialize attendance variable
        $attendance = null;

        if ($correctionRequest->type === 'missing') {
            $attendanceDate = Carbon::parse($correctionRequest->requested_check_in)->toDateString();
            
            // Check if an attendance record already exists for this date
            $attendance = Attendance::where('employee_id', $correctionRequest->employee_id)
                ->where('date', $attendanceDate)
                ->first();

            if ($attendance) {
                // Update existing record
                $attendance->update([
                    'check_in' => $correctionRequest->requested_check_in,
                    'check_out' => $correctionRequest->requested_check_out,
                    'status' => 'present', // Will be recalculated by AttendanceLogic
                ]);
                
                // Delete old breaks before adding new ones
                $attendance->breaks()->delete();
            } else {
                // Create new attendance record if it doesn't exist
                $attendance = Attendance::create([
                    'employee_id' => $correctionRequest->employee_id,
                    'date' => $attendanceDate,
                    'check_in' => $correctionRequest->requested_check_in,
                    'check_out' => $correctionRequest->requested_check_out,
                    'status' => 'present', // Will be recalculated by AttendanceLogic
                ]);
            }

            // Create breaks if requested
            $requestedBreaks = $correctionRequest->requested_breaks;
            if (!is_array($requestedBreaks) && is_string($requestedBreaks)) {
                $requestedBreaks = json_decode($requestedBreaks, true);
            }

            if ($requestedBreaks && is_array($requestedBreaks)) {
                foreach ($requestedBreaks as $breakData) {
                    if (!empty($breakData['break_start']) || !empty($breakData['break_end'])) {
                        $breakRecord = [
                            'attendance_id' => $attendance->id,
                        ];

                        if (!empty($breakData['break_start'])) {
                            try {
                                $breakStartDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $breakData['break_start']);
                                $breakRecord['break_start'] = $breakStartDateTime->toDateTimeString();
                            } catch (\Exception $e) {
                                \Log::error('Error parsing break start: ' . $e->getMessage());
                            }
                        }

                        if (!empty($breakData['break_end'])) {
                            try {
                                $breakEndDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $breakData['break_end']);
                                $breakRecord['break_end'] = $breakEndDateTime->toDateTimeString();
                            } catch (\Exception $e) {
                                \Log::error('Error parsing break end: ' . $e->getMessage());
                            }
                        }

                        if (!empty($breakRecord['break_start']) || !empty($breakRecord['break_end'])) {
                            BreakRecord::create($breakRecord);
                        }
                    }
                }
            }
        } else {
            // Update existing attendance
            $attendance = $correctionRequest->attendance;
            
            if ($correctionRequest->type === 'wrong_checkin') {
                $attendance->update(['check_in' => $correctionRequest->requested_check_in]);
            } elseif ($correctionRequest->type === 'wrong_checkout') {
                $attendance->update(['check_out' => $correctionRequest->requested_check_out]);
            } elseif ($correctionRequest->type === 'wrong_break') {
                // Delete existing breaks
                $attendance->breaks()->delete();

                // Create new breaks
                $requestedBreaks = $correctionRequest->requested_breaks;
                if (!is_array($requestedBreaks) && is_string($requestedBreaks)) {
                    $requestedBreaks = json_decode($requestedBreaks, true);
                }

                if ($requestedBreaks && is_array($requestedBreaks)) {
                    foreach ($requestedBreaks as $breakData) {
                        if (!empty($breakData['break_start']) || !empty($breakData['break_end'])) {
                            $breakRecord = [
                                'attendance_id' => $attendance->id,
                            ];

                            if (!empty($breakData['break_start'])) {
                                try {
                                    $breakStartDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $breakData['break_start']);
                                    $breakRecord['break_start'] = $breakStartDateTime->toDateTimeString();
                                } catch (\Exception $e) {
                                    \Log::error('Error parsing break start: ' . $e->getMessage());
                                }
                            }

                            if (!empty($breakData['break_end'])) {
                                try {
                                    $breakEndDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $breakData['break_end']);
                                    $breakRecord['break_end'] = $breakEndDateTime->toDateTimeString();
                                } catch (\Exception $e) {
                                    \Log::error('Error parsing break end: ' . $e->getMessage());
                                }
                            }

                            if (!empty($breakRecord['break_start']) || !empty($breakRecord['break_end'])) {
                                BreakRecord::create($breakRecord);
                            }
                        }
                    }
                }
            }
        }

        // Recalculate attendance status using AttendanceLogic
        if ($attendance) {
            $attendanceLogic = new AttendanceLogic();
            $newStatus = $attendanceLogic->calculateStatus($attendance->employee, $attendance);
            $attendance->update(['status' => $newStatus]);
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
        if ($correctionRequest->employee && $correctionRequest->employee->email) {
            Mail::to($correctionRequest->employee->email)->send(new AttendanceCorrectionRequestMail($correctionRequest, 'approved'));
        }

        return response()->json(['message' => 'Correction request approved successfully']);
    }

    public function rejectCorrectionRequest(Request $request, $id)
    {
        $admin = $request->user();
        $correctionRequest = AttendanceCorrectionRequest::with('employee')->findOrFail($id);

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
        if ($correctionRequest->employee && $correctionRequest->employee->email) {
            Mail::to($correctionRequest->employee->email)->send(new AttendanceCorrectionRequestMail($correctionRequest, 'rejected'));
        }

        return response()->json(['message' => 'Correction request rejected successfully']);
    }

    public function getCorrectionRequests(Request $request)
    {
        try {
            $employee = $request->user();

            $requests = AttendanceCorrectionRequest::where('employee_id', $employee->id)
                ->with('attendance')
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($request) {
                    try {
                        // Determine the date for the request
                        $requestDate = null;
                        if ($request->attendance) {
                            $requestDate = $request->attendance->date;
                        } elseif ($request->type === 'missing' && $request->requested_check_in) {
                            $requestDate = Carbon::parse($request->requested_check_in)->toDateString();
                        }

                        return [
                            'id' => $request->id,
                            'type' => $request->type,
                            'requested_check_in' => $request->requested_check_in ? Carbon::parse($request->requested_check_in)->format('H:i') : null,
                            'requested_check_out' => $request->requested_check_out ? Carbon::parse($request->requested_check_out)->format('H:i') : null,
                            'requested_breaks' => $request->requested_breaks,
                            'reason' => $request->reason,
                            'status' => $request->status,
                            'submitted_at' => $request->created_at->toISOString(),
                            'processed_at' => $request->approved_at ?? $request->rejected_at,
                            'date' => $requestDate,
                            'attendance' => $request->attendance ? [
                                'id' => $request->attendance->id,
                                'date' => $request->attendance->date,
                                'check_in' => $request->attendance->check_in ? $request->attendance->check_in->format('H:i') : null,
                                'check_out' => $request->attendance->check_out ? $request->attendance->check_out->format('H:i') : null,
                            ] : null,
                        ];
                    } catch (\Exception $e) {
                        \Log::error('Error processing correction request ' . $request->id . ': ' . $e->getMessage());
                        return null; // Skip this request
                    }
                })
                ->filter(function ($request) {
                    return $request !== null;
                });

            return response()->json(['requests' => $requests]);
        } catch (\Exception $e) {
            \Log::error('Error in getCorrectionRequests: ' . $e->getMessage());
            return response()->json(['message' => 'An error occurred while fetching correction requests'], 500);
        }
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
            $checkInDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $data['check_in']);
            $updates['check_in'] = $checkInDateTime->toDateTimeString();
        }
        if (isset($data['check_out'])) {
            $checkOutDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $data['check_out']);
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

    public function getDepartments()
    {
        $departments = \App\Models\Employee::distinct()
            ->whereNotNull('department')
            ->pluck('department')
            ->filter()
            ->sort()
            ->values();

        return response()->json(['departments' => $departments]);
    }

    public function getEmployeesByDepartment(Request $request)
    {
        $department = $request->input('department');

        $query = \App\Models\Employee::select('id', 'employee_id', 'name', 'department', 'designation')
            ->where('status', 'active');

        if ($department && $department !== 'all') {
            $query->where('department', $department);
        }

        $employees = $query->orderBy('name')->get();

        return response()->json(['employees' => $employees]);
    }

    public function getAttendanceLogs(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $attendances = Attendance::where('employee_id', $data['employee_id'])
            ->whereBetween('date', [$data['start_date'], $data['end_date']])
            ->with(['employee:id,employee_id,name', 'breaks'])
            ->orderBy('date', 'desc')
            ->get()
            ->map(function ($attendance) {
                return [
                    'id' => $attendance->id,
                    'date' => $attendance->date,
                    'check_in' => $attendance->check_in ? $attendance->check_in->format('H:i') : null,
                    'check_out' => $attendance->check_out ? $attendance->check_out->format('H:i') : null,
                    'status' => $attendance->status,
                    'employee' => $attendance->employee,
                    'breaks' => $attendance->breaks->map(function ($break) {
                        return [
                            'id' => $break->id,
                            'break_start' => $break->break_start ? $break->break_start->format('H:i') : null,
                            'break_end' => $break->break_end ? $break->break_end->format('H:i') : null,
                        ];
                    }),
                ];
            });

        return response()->json(['attendances' => $attendances]);
    }

    public function addNewAttendance(Request $request)
    {
        $admin = $request->user();

        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'reason' => 'required|string|max:500',
        ]);

        // Check if attendance already exists for this date
        $existingAttendance = Attendance::where('employee_id', $data['employee_id'])
            ->where('date', $data['date'])
            ->first();

        if ($existingAttendance) {
            return response()->json(['message' => 'Attendance record already exists for this date'], 409);
        }

        $attendanceData = [
            'employee_id' => $data['employee_id'],
            'date' => $data['date'],
            'status' => 'present',
        ];

        if (isset($data['check_in'])) {
            $checkInDateTime = Carbon::createFromFormat('Y-m-d H:i', $data['date'] . ' ' . $data['check_in']);
            $attendanceData['check_in'] = $checkInDateTime->toDateTimeString();
        }

        if (isset($data['check_out'])) {
            $checkOutDateTime = Carbon::createFromFormat('Y-m-d H:i', $data['date'] . ' ' . $data['check_out']);
            $attendanceData['check_out'] = $checkOutDateTime->toDateTimeString();
        }

        $attendance = Attendance::create($attendanceData);

        // Log the action
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'add_new_attendance',
            'model_type' => 'Attendance',
            'model_id' => $attendance->id,
            'new_values' => json_encode(array_merge($attendanceData, ['reason' => $data['reason']])),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'New attendance record added successfully',
            'attendance' => $attendance
        ], 201);
    }

    public function updateAttendanceRecord(Request $request, $id)
    {
        try {
            $admin = $request->user();
            $attendance = Attendance::findOrFail($id);

            // Log the incoming request data
            \Log::info('Update Attendance Request Data:', $request->all());

            // Clean the data to convert empty strings to null and parse times
            $data = $request->all();

            // Normalize timing fields
            $data['check_in'] = $this->parseTime($data['check_in'] ?? null);
            $data['check_out'] = $this->parseTime($data['check_out'] ?? null);

            if (isset($data['breaks']) && is_array($data['breaks'])) {
                $data['breaks'] = array_map(function ($break) {
                    return [
                        'break_start' => $this->parseTime($break['break_start'] ?? null),
                        'break_end' => $this->parseTime($break['break_end'] ?? null),
                    ];
                }, $data['breaks']);
            }

            \Log::info('Cleaned Data:', $data);

            // Validate the cleaned data using Validator so empty strings are handled as null
            $validator = Validator::make($data, [
                'check_in' => 'nullable|date_format:H:i',
                'check_out' => 'nullable|date_format:H:i',
                'breaks' => 'nullable|array',
                'breaks.*.break_start' => ['nullable', 'regex:/^[0-9]{2}:[0-9]{2}$/'],
                'breaks.*.break_end' => ['nullable', 'regex:/^[0-9]{2}:[0-9]{2}$/'],
                'reason' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                \Log::error('Validation Error:', $validator->errors()->toArray());
                return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
            }

            $data = $validator->validated();
            \Log::info('Validated Data:', $data);
        } catch (\Exception $e) {
            \Log::error('Validation Error:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Validation failed: ' . $e->getMessage()], 400);
        }

        $oldValues = [
            'check_in' => $attendance->check_in ? $attendance->check_in->format('H:i') : null,
            'check_out' => $attendance->check_out ? $attendance->check_out->format('H:i') : null,
            'breaks' => $attendance->breaks->map(function ($break) {
                return [
                    'id' => $break->id,
                    'break_start' => $break->break_start ? $break->break_start->format('H:i') : null,
                    'break_end' => $break->break_end ? $break->break_end->format('H:i') : null,
                ];
            })->toArray(),
        ];

        $updates = [];
        if (isset($data['check_in'])) {
            $checkInDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $data['check_in']);
            $updates['check_in'] = $checkInDateTime->toDateTimeString();
        }
        if (isset($data['check_out'])) {
            $checkOutDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $data['check_out']);
            $updates['check_out'] = $checkOutDateTime->toDateTimeString();
        }

        $attendance->update($updates);

        // Handle breaks - always process breaks even if empty to allow deletion of existing breaks
        if (isset($data['breaks'])) {
            // Always delete existing breaks first
            $attendance->breaks()->delete();

            // Create new breaks only if provided and not empty
            if (is_array($data['breaks']) && !empty($data['breaks'])) {
                foreach ($data['breaks'] as $breakData) {
                    if (!empty($breakData['break_start']) || !empty($breakData['break_end'])) {
                        $breakRecord = [
                            'attendance_id' => $attendance->id,
                        ];

                        if (!empty($breakData['break_start'])) {
                            $breakStartDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $breakData['break_start']);
                            $breakRecord['break_start'] = $breakStartDateTime->toDateTimeString();
                        }

                        if (!empty($breakData['break_end'])) {
                            $breakEndDateTime = Carbon::createFromFormat('Y-m-d H:i', $attendance->date->format('Y-m-d') . ' ' . $breakData['break_end']);
                            $breakRecord['break_end'] = $breakEndDateTime->toDateTimeString();
                        }

                        BreakRecord::create($breakRecord);
                    }
                }
            }
        }

        // Log the action
        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'update_attendance_record',
            'model_type' => 'Attendance',
            'model_id' => $attendance->id,
            'old_values' => json_encode($oldValues),
            'new_values' => json_encode(array_merge($updates, [
                'breaks' => $data['breaks'] ?? [],
                'reason' => $data['reason']
            ])),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Attendance record updated successfully',
            'attendance' => $attendance->load('breaks')
        ]);
    }
}
