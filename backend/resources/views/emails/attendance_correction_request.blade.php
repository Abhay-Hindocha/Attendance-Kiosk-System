<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Attendance Correction Request {{ ucfirst($action) }}</title>
</head>
<body>
    <h1>Your Attendance Correction Request Has Been {{ ucfirst($action) }}</h1>

    <p>Dear {{ $correctionRequest->employee->name }},</p>

    <p>Your attendance correction request has been <strong>{{ $action }}</strong>.</p>

    <h2>Request Details:</h2>
    <ul>
        <li><strong>Type:</strong> {{ ucfirst(str_replace('_', ' ', $correctionRequest->type)) }}</li>
        <li><strong>Reason:</strong> {{ $correctionRequest->reason }}</li>
        @if($correctionRequest->requested_check_in)
            <li><strong>Requested Check-in:</strong> {{ $correctionRequest->requested_check_in->format('H:i') }}</li>
        @endif
        @if($correctionRequest->requested_check_out)
            <li><strong>Requested Check-out:</strong> {{ $correctionRequest->requested_check_out->format('H:i') }}</li>
        @endif
        @if($correctionRequest->attendance)
            <li><strong>Original Check-in:</strong> {{ $correctionRequest->attendance->check_in ? $correctionRequest->attendance->check_in->format('H:i') : 'N/A' }}</li>
            <li><strong>Original Check-out:</strong> {{ $correctionRequest->attendance->check_out ? $correctionRequest->attendance->check_out->format('H:i') : 'N/A' }}</li>
            <li><strong>Date:</strong> {{ $correctionRequest->attendance->date }}</li>
        @endif
        <li><strong>Submitted At:</strong> {{ $correctionRequest->created_at->format('d M Y H:i') }}</li>
        <li><strong>Processed At:</strong> {{ $correctionRequest->approved_at ?? $correctionRequest->rejected_at }}</li>
    </ul>

    @if($action === 'approved')
        <p>Your attendance record has been updated accordingly.</p>
    @else
        <p>If you have any questions or need to submit a new request, please contact your administrator.</p>
    @endif

    <p>Thank you,<br>
    Attendance Management System</p>
</body>
</html>
