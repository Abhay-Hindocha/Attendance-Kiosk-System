<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Leave Request Submitted</title>
</head>
<body>
    <h1>New Leave Request Submitted</h1>

    <p>Dear Admin,</p>

    <p>A new leave request has been submitted by an employee. Please review and take appropriate action.</p>

    <h2>Request Details:</h2>
    <ul>
        <li><strong>Employee:</strong> {{ $leaveRequest->employee->name }} ({{ $leaveRequest->employee->employee_id }})</li>
        <li><strong>Department:</strong> {{ $leaveRequest->employee->department }}</li>
        <li><strong>Leave Type:</strong> {{ $leaveRequest->policy->name }} ({{ $leaveRequest->policy->code }})</li>
        <li><strong>From Date:</strong> {{ $leaveRequest->from_date }}</li>
        <li><strong>To Date:</strong> {{ $leaveRequest->to_date }}</li>
        <li><strong>Total Days:</strong> {{ $leaveRequest->total_days }}</li>
        <li><strong>Reason:</strong> {{ $leaveRequest->reason ?: 'Not provided' }}</li>
        <li><strong>Partial Day:</strong> {{ ucfirst(str_replace('_', ' ', $leaveRequest->partial_day)) }}</li>
        @if($leaveRequest->partial_session)
            <li><strong>Partial Session:</strong> {{ ucfirst(str_replace('_', ' ', $leaveRequest->partial_session)) }}</li>
        @endif
        <li><strong>Submitted At:</strong> {{ $leaveRequest->submitted_at->format('d M Y H:i') }}</li>
    </ul>

    <p>Please log in to the admin panel to approve or reject this request.</p>

    <p>Thank you,<br>
    Attendance Management System</p>
</body>
</html>