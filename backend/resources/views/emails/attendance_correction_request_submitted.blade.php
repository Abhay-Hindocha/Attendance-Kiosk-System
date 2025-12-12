<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Attendance Correction Request Submitted</title>
</head>
<body>
    <h1>New Attendance Correction Request Submitted</h1>

    <p>Dear Admin,</p>

    <p>A new attendance correction request has been submitted by an employee. Please review and take appropriate action.</p>

    <h2>Request Details:</h2>
    <ul>
        <li><strong>Employee:</strong> {{ $correctionRequest->employee->name }} ({{ $correctionRequest->employee->employee_id }})</li>
        <li><strong>Department:</strong> {{ $correctionRequest->employee->department }}</li>
        <li><strong>Type:</strong> {{ ucfirst(str_replace('_', ' ', $correctionRequest->type)) }}</li>
        <li><strong>Reason:</strong> {{ $correctionRequest->reason }}</li>
        @if($correctionRequest->date)
            <li><strong>Date:</strong> {{ $correctionRequest->date }}</li>
        @elseif($correctionRequest->attendance)
            <li><strong>Date:</strong> {{ $correctionRequest->attendance->date }}</li>
        @endif
        @if($correctionRequest->requested_check_in)
            <li><strong>Requested Check-in:</strong> {{ $correctionRequest->requested_check_in->format('H:i') }}</li>
        @endif
        @if($correctionRequest->requested_check_out)
            <li><strong>Requested Check-out:</strong> {{ $correctionRequest->requested_check_out->format('H:i') }}</li>
        @endif
        @if($correctionRequest->attendance)
            <li><strong>Original Check-in:</strong> {{ $correctionRequest->attendance->check_in ? $correctionRequest->attendance->check_in->format('H:i') : 'N/A' }}</li>
            <li><strong>Original Check-out:</strong> {{ $correctionRequest->attendance->check_out ? $correctionRequest->attendance->check_out->format('H:i') : 'N/A' }}</li>
        @endif
        <li><strong>Submitted At:</strong> {{ $correctionRequest->created_at->format('d M Y H:i') }}</li>
    </ul>

    <p>Please log in to the admin panel to approve or reject this request.</p>

    <p>Thank you,<br>
    Attendance Management System</p>
</body>
</html>