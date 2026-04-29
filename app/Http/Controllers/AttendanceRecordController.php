<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateManualPunchStatusRequest;
use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\DailyAttendance;
use App\Models\Employee;
use App\Services\Biometric\AttendanceAggregator;
use App\Services\Biometric\WebAuthnService;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceRecordController extends Controller
{
    public function __construct(
        private readonly AttendanceAggregator $aggregator,
        private readonly WebAuthnService $webauthn,
    ) {}

    public function index(Request $request): Response
    {
        $employeeId = $request->user()->employee_id;

        $records = DailyAttendance::query()
            ->where('employee_id', $employeeId)
            ->orderByDesc('date')
            ->take(50)
            ->get()
            ->map(fn (DailyAttendance $record): array => [
                'id' => $record->id,
                'date' => $record->date?->format('Y-m-d'),
                'time_in' => $record->time_in,
                'time_out' => $record->time_out,
                'status' => $record->status,
                'late_minutes' => (int) $record->late_minutes,
                'source' => $record->source,
            ]);

        $rawPunches = AttendanceRecord::query()
            ->where('employee_id', $employeeId)
            ->orderByDesc('punch_time')
            ->take(50)
            ->get()
            ->map(fn (AttendanceRecord $record): array => [
                'id' => $record->id,
                'date' => $record->date?->format('Y-m-d'),
                'punch_time' => $record->punch_time?->format('Y-m-d H:i:s'),
                'source' => $record->source,
            ]);

        $hasDevice = BiometricDevice::query()->where('is_active', true)->exists();

        $employee = Employee::find($employeeId);
        $employee?->refreshManualPunchStatus();

        $enrollmentStatus = $employee !== null
            ? $this->webauthn->status($employee)
            : [
                'enrolled' => false,
                'enrolled_at' => null,
                'rp_id' => null,
            ];

        return Inertia::render('attendance', [
            'records' => $records,
            'rawPunches' => $rawPunches,
            'employeeId' => $employeeId ?? '',
            'employeeName' => $employee?->name ?? $request->user()->name,
            'hasDevice' => $hasDevice,
            'enrolledInBiometric' => ! empty($employee?->webauthn_credential_id),
            'enrollmentStatus' => $enrollmentStatus,
            'manualPunchEnabled' => (bool) ($employee?->manual_punch_enabled ?? false),
        ]);
    }

    public function punch(Request $request): RedirectResponse
    {
        $request->validate([
            'employee_id' => ['required', 'string'],
        ]);

        $user = $request->user();
        $inputEmployeeId = $request->string('employee_id')->toString();

        // Ensure the employee ID matches the logged-in user
        if ($user->employee_id !== $inputEmployeeId) {
            return back()->withErrors(['employee_id' => 'Employee ID does not match your account.']);
        }

        // Reconcile the schedule against today's date before checking the flag.
        $employee = \App\Models\Employee::find($inputEmployeeId);
        $employee?->refreshManualPunchStatus();

        if (! $employee?->manual_punch_enabled) {
            return back()->withErrors(['employee_id' => 'Manual attendance punch is not enabled for your account. Contact your supervisor.']);
        }

        $now = Carbon::now();

        AttendanceRecord::query()->create([
            'employee_id' => $inputEmployeeId,
            'date' => $now->toDateString(),
            'punch_time' => $now,
            'status' => null,
            'source' => 'manual',
        ]);

        $this->aggregator->recomputeForEmployeeDate(
            $inputEmployeeId,
            CarbonImmutable::parse($now->toDateString()),
        );

        return back()->with('success', 'Attendance recorded successfully at '.$now->format('h:i A').'.');
    }

    public function updateManualPunchStatus(UpdateManualPunchStatusRequest $request, Employee $employee): RedirectResponse
    {
        $manualPunchEnabled = $request->boolean('manual_punch_enabled');

        if ($manualPunchEnabled) {
            $startDate = Carbon::parse($request->string('start_date')->toString());
            $endDate = Carbon::parse($request->string('end_date')->toString());
            $today = Carbon::today();

            if ($today->isAfter($endDate)) {
                return back()->withErrors(['end_date' => 'End date has already passed.']);
            }

            // Only set enabled to true if today falls within the scheduled range
            $withinRange = $today->greaterThanOrEqualTo($startDate) && $today->lessThanOrEqualTo($endDate);

            $employee->update([
                'manual_punch_enabled' => $withinRange,
                'manual_punch_reason' => $request->string('reason')->toString(),
                'manual_punch_start_date' => $startDate->toDateString(),
                'manual_punch_end_date' => $endDate->toDateString(),
            ]);

            $status = $withinRange ? 'enabled' : 'scheduled';
            $message = $withinRange
                ? "Manual punch enabled for {$employee->name}."
                : "Manual punch scheduled for {$employee->name} from {$startDate->format('M d, Y')} to {$endDate->format('M d, Y')}.";
        } else {
            $employee->update([
                'manual_punch_enabled' => false,
                'manual_punch_reason' => null,
                'manual_punch_start_date' => null,
                'manual_punch_end_date' => null,
            ]);

            $message = "Manual punch disabled for {$employee->name}.";
        }

        return back()->with('success', $message);
    }
}
