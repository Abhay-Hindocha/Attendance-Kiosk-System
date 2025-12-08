<?php

namespace App\Mail;

use App\Models\AttendanceCorrectionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AttendanceCorrectionRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public $correctionRequest;
    public $action;

    /**
     * Create a new message instance.
     */
    public function __construct(AttendanceCorrectionRequest $correctionRequest, string $action)
    {
        $this->correctionRequest = $correctionRequest;
        $this->action = $action;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->action === 'approved'
            ? 'Your Attendance Correction Request Has Been Approved'
            : 'Your Attendance Correction Request Has Been Rejected';

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.attendance_correction_request',
            with: [
                'correctionRequest' => $this->correctionRequest,
                'action' => $this->action,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
