<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployeeAccountCredentialsNotification extends Notification
{
    public function __construct(
        private readonly string $employeeName,
        private readonly string $employeeId,
        private readonly string $email,
        private readonly string $temporaryPassword,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('Your Smart HRMS account credentials')
            ->greeting("Hello {$this->employeeName},")
            ->line('An HR personnel account manager created your Smart HRMS account.')
            ->line("Employee ID: {$this->employeeId}")
            ->line("Login email: {$this->email}")
            ->line("Temporary password: {$this->temporaryPassword}")
            ->line('Please sign in and change your password as soon as possible after your first login.')
            ->salutation('Regards, Smart HRMS');

        $override = config('mail.credentials_recipient');

        if (is_string($override) && $override !== '') {
            $message->to($override);
        }

        return $message;
    }
}
