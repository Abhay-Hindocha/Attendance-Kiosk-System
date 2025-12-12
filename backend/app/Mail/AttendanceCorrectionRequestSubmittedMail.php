<?php

namespace App\Mail;

use App\Models\AttendanceCorrectionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AttendanceCorrectionRequestSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $correctionRequest;

    /**
     * Create a new message instance.
     */
    public function __construct(AttendanceCorrectionRequest $correctionRequest)
    {
        $this->correctionRequest = $correctionRequest;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New Attendance Correction Request Submitted',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.attendance_correction_request_submitted',
            with: [
                'correctionRequest' => $this->correctionRequest,
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