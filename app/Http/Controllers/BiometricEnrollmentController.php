<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Services\Biometric\EnrollmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class BiometricEnrollmentController extends Controller
{
    public function __construct(
        private readonly EnrollmentService $enrollmentService,
    ) {}

    public function show(Request $request): Response
    {
        $employee = Employee::query()->findOrFail($request->user()->employee_id);

        try {
            $terminals = $this->enrollmentService->terminals();
            $terminalsError = null;
        } catch (Throwable $e) {
            $terminals = [];
            $terminalsError = 'Could not load terminals from ZKBio Time. Try again later.';
        }

        return Inertia::render('biometric-enrollment', [
            'employee' => [
                'employee_id' => $employee->employee_id,
                'name' => $employee->name,
            ],
            'enrollmentStatus' => $this->enrollmentService->verificationStatus($employee),
            'terminals' => $terminals,
            'terminalsError' => $terminalsError,
            'defaultTerminalSn' => config('services.zkbiotime.default_terminal_sn'),
        ]);
    }
}
