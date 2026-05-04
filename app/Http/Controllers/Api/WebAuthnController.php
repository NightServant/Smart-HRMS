<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\Employee;
use App\Services\Biometric\AttendanceAggregator;
use App\Services\Biometric\WebAuthnService;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class WebAuthnController extends Controller
{
    public function __construct(
        private readonly WebAuthnService $webauthn,
        private readonly AttendanceAggregator $aggregator,
    ) {}

    public function registerOptions(Request $request): JsonResponse
    {
        $employee = $this->resolveEmployee($request);

        return response()->json($this->webauthn->generateRegistrationOptions($employee));
    }

    public function register(Request $request): JsonResponse
    {
        $employee = $this->resolveEmployee($request);

        $payload = $request->validate([
            'id' => ['required', 'string'],
            'response' => ['required', 'array'],
            'response.clientDataJSON' => ['required', 'string'],
            'response.publicKey' => ['required', 'string'],
            'response.publicKeyAlgorithm' => ['required', 'integer'],
        ]);

        try {
            $this->webauthn->verifyRegistration($employee, $payload);
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }

        return response()->json([
            'status' => 'registered',
            'enrolled_at' => $employee->refresh()->webauthn_enrolled_at?->toIso8601String(),
        ]);
    }

    public function clockOptions(Request $request): JsonResponse
    {
        $employee = $this->resolveEmployee($request);

        try {
            return response()->json($this->webauthn->generateAuthenticationOptions($employee));
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function clock(Request $request): JsonResponse
    {
        $employee = $this->resolveEmployee($request);

        $validated = $request->validate([
            'mode' => ['required', 'in:in,out'],
            'assertion' => ['required', 'array'],
            'assertion.id' => ['required', 'string'],
            'assertion.response' => ['required', 'array'],
            'assertion.response.clientDataJSON' => ['required', 'string'],
            'assertion.response.authenticatorData' => ['required', 'string'],
            'assertion.response.signature' => ['required', 'string'],
        ]);

        try {
            $verified = $this->webauthn->verifyAuthentication($employee, $validated['assertion']);
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }

        if (! $verified) {
            return response()->json(
                ['error' => 'Fingerprint verification failed. Please try again.'],
                422,
            );
        }

        BiometricDevice::query()->firstOrCreate(
            ['serial_number' => 'WEB-WEBAUTHN'],
            ['name' => 'Web Browser (WebAuthn)', 'is_active' => true],
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

    public function status(Request $request): JsonResponse
    {
        $employee = $this->resolveEmployee($request);

        return response()->json($this->webauthn->status($employee));
    }

    private function resolveEmployee(Request $request): Employee
    {
        $user = $request->user();

        if (! $user || ! $user->employee_id) {
            throw new AccessDeniedHttpException('Authenticated employee account is required.');
        }

        return Employee::query()->findOrFail($user->employee_id);
    }
}
