<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\Employee;
use App\Services\Biometric\AttendanceAggregator;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BiometricSimulatorController extends Controller
{
    public function __construct(
        private readonly AttendanceAggregator $aggregator,
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $employeeId = $user?->employee_id;

        if (! $employeeId) {
            return back()->withErrors(['employee_id' => 'No employee ID linked to your account.']);
        }

        $employee = Employee::query()->find($employeeId);

        if (! $employee) {
            return back()->withErrors(['employee_id' => 'Employee record not found.']);
        }

        BiometricDevice::query()->firstOrCreate(
            ['serial_number' => 'SIMULATOR'],
            ['name' => 'Web Simulator', 'is_active' => true],
        );

        $now = Carbon::now();

        $record = AttendanceRecord::query()->firstOrCreate(
            [
                'employee_id' => $employee->employee_id,
                'punch_time' => $now,
            ],
            [
                'date' => $now->toDateString(),
                'status' => null,
                'source' => 'biometric',
            ],
        );

        if (! $record->wasRecentlyCreated) {
            return back()->withErrors(['employee_id' => 'Attendance already recorded for this timestamp.']);
        }

        $this->aggregator->recomputeForEmployeeDate(
            (string) $employee->employee_id,
            CarbonImmutable::parse($now->toDateString()),
        );

        return back()->with('success', 'Biometric punch recorded at '.$now->format('h:i A').'.');
    }
}
