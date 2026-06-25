<?php

namespace App\Console\Commands;

use App\Mail\EmployeeUserCredentials;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendTestCredentialsEmail extends Command
{
    protected $signature = 'mail:test-credentials {email}';

    protected $description = 'Send a test EmployeeUserCredentials email to verify Resend API delivery.';

    public function handle(): int
    {
        $email = (string) $this->argument('email');

        Mail::to($email)->send(new EmployeeUserCredentials(
            employeeName: 'Test Employee',
            employeeId: 'EMP-TEST',
            email: $email,
            temporaryPassword: 'TempPass1234',
        ));

        $this->info("Test credentials email sent to {$email}.");

        return self::SUCCESS;
    }
}
