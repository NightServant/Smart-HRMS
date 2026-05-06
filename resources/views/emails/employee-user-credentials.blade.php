<x-mail::message>
Hello {{ $employeeName }},

An HR personnel account manager has created your **Smart HRMS** account. Use the credentials below to sign in for the first time.

<x-mail::panel>
**Employee ID:** {{ $employeeId }}

**Login Email:** {{ $email }}

**Temporary Password:** {{ $temporaryPassword }}
</x-mail::panel>

Please sign in and change your password as soon as possible after your first login.

<x-mail::button :url="config('app.url')">
Sign In to Smart HRMS
</x-mail::button>

If you did not expect this email, please contact your HR department immediately.

Regards,
Smart HRMS
</x-mail::message>
