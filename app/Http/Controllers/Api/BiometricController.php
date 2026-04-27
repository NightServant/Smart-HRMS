<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Biometric\EnrollEmployeeRequest;
use App\Http\Requests\Biometric\SelfEnrollRequest;
use App\Models\AttendanceRecord;
use App\Models\DailyAttendance;
use App\Models\Employee;
use App\Services\Biometric\EnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class BiometricController extends Controller
{
    public function __construct(
        private readonly EnrollmentService $enrollmentService,
    ) {}

    public function attendance(Request $request, Employee $employee): JsonResponse
    {
        $this->authorizeEmployeeAccess($request, $employee);

        $since = now()->subDays(30)->startOfDay();

        $daily = DailyAttendance::query()
            ->where('employee_id', $employee->employee_id)
            ->whereDate('date', '>=', $since->toDateString())
            ->orderByDesc('date')
            ->get();

        $rawPunches = AttendanceRecord::query()
            ->where('employee_id', $employee->employee_id)
            ->where('punch_time', '>=', $since)
            ->orderBy('punch_time')
            ->get(['id', 'date', 'punch_time', 'source']);

        return response()->json([
            'employee_id' => $employee->employee_id,
            'daily' => $daily,
            'raw_punches' => $rawPunches,
        ]);
    }

    public function enroll(EnrollEmployeeRequest $request): JsonResponse
    {
        $employee = Employee::query()->findOrFail($request->string('employee_id')->toString());

        $departmentId = $request->filled('department_id')
            ? $request->string('department_id')->toString()
            : null;

        $result = $this->enrollmentService->enroll($employee, $departmentId);

        return response()->json($result->toArray());
    }

    public function selfEnroll(SelfEnrollRequest $request): JsonResponse
    {
        $employee = Employee::query()->findOrFail($request->user()->employee_id);

        $result = $this->enrollmentService->enroll($employee);

        return response()->json($result->toArray());
    }

    public function enrollmentStatus(Request $request): JsonResponse
    {
        if ($request->user()?->role !== 'employee' || ! $request->user()?->employee_id) {
            throw new AccessDeniedHttpException;
        }

        $employee = Employee::query()->findOrFail($request->user()->employee_id);

        return response()->json($this->enrollmentService->verificationStatus($employee));
    }

    public function departments(): JsonResponse
    {
        return response()->json([
            'departments' => $this->enrollmentService->departments(),
        ]);
    }

    private function authorizeEmployeeAccess(Request $request, Employee $employee): void
    {
        $user = $request->user();

        if (! $user) {
            throw new AccessDeniedHttpException;
        }

        if (in_array($user->role, ['hr-personnel', 'evaluator'], true)) {
            return;
        }

        if ($user->role === 'employee' && $user->employee_id === $employee->employee_id) {
            return;
        }

        throw new AccessDeniedHttpException;
    }
}
