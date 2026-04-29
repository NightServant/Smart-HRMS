<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Biometric\EnrollEmployeeRequest;
use App\Http\Requests\Biometric\SelfEnrollRequest;
use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\DailyAttendance;
use App\Models\Employee;
use App\Services\Biometric\AttendanceAggregator;
use App\Services\Biometric\EnrollmentService;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class BiometricController extends Controller
{
    public function __construct(
        private readonly EnrollmentService $enrollmentService,
        private readonly AttendanceAggregator $aggregator,
    ) {}

    public function clock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => ['required', 'string'],
            'zkteco_pin' => ['required', 'string'],
            'mode' => ['required', 'in:in,out'],
        ]);

        $user = $request->user();

        if (! $user || $user->employee_id !== $validated['employee_id']) {
            return response()->json(
                ['error' => 'Employee ID does not match your account.'],
                403,
            );
        }

        $employee = Employee::query()->find($validated['employee_id']);
        if (! $employee) {
            return response()->json(
                ['error' => 'Employee record not found.'],
                404,
            );
        }

        if (empty($employee->zkteco_pin) || $employee->zkteco_pin !== $validated['zkteco_pin']) {
            return response()->json(
                ['error' => 'Fingerprint is not registered for your account. Please enroll first.'],
                422,
            );
        }

        // Ensure a biometric device row exists so the punch can be attributed.
        BiometricDevice::query()->firstOrCreate(
            ['serial_number' => 'WEB-CLOCK'],
            ['name' => 'Web Clock-In/Out', 'is_active' => true],
        );

        $now = Carbon::now();

        $existing = AttendanceRecord::query()
            ->where('employee_id', $employee->employee_id)
            ->where('punch_time', $now)
            ->exists();

        if ($existing) {
            return response()->json(
                ['error' => 'A punch is already recorded for this exact timestamp. Wait a moment and try again.'],
                422,
            );
        }

        AttendanceRecord::query()->create([
            'employee_id' => $employee->employee_id,
            'date' => $now->toDateString(),
            'punch_time' => $now,
            'status' => null,
            'source' => 'biometric',
        ]);

        $this->aggregator->recomputeForEmployeeDate(
            (string) $employee->employee_id,
            CarbonImmutable::parse($now->toDateString()),
        );

        $modeLabel = $validated['mode'] === 'in' ? 'Clock-in' : 'Clock-out';

        return response()->json([
            'message' => "{$modeLabel} recorded at ".$now->format('h:i A').'.',
        ]);
    }

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

    public function triggerRemoteEnrollment(Request $request): JsonResponse
    {
        $employeeId = $request->user()?->role === 'employee'
            ? $request->user()->employee_id
            : $request->string('employee_id')->toString();

        $employee = Employee::query()->findOrFail($employeeId);
        $deviceSn = $request->filled('device_sn')
            ? $request->string('device_sn')->toString()
            : null;

        return response()->json(
            $this->enrollmentService->triggerRemoteEnrollment($employee, $deviceSn),
        );
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
