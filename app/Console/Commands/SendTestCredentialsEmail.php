<?php

namespace App\Console\Commands;

use App\Notifications\EmployeeAccountCredentialsNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class SendTestCredentialsEmail extends Command
{
    protected $signature = 'mail:test-credentials {email}';

    protected $description = 'Send a sample EmployeeAccountCredentialsNotification to verify SMTP delivery.';

    public function handle(): int
    {
        $email = (string) $this->argument('email');

        Notification::route('mail', $email)->notify(
            new EmployeeAccountCredentialsNotification(
                employeeName: 'Test Employee',
                employeeId: 'EMP-TEST',
                email: $email,
                temporaryPassword: 'TempPass1234',
            )
        );

        $this->info("Test credentials email dispatched to {$email}.");

        return self::SUCCESS;
    }
}
