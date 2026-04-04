<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateManualPunchStatusRequest;
use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceRecordController extends Controller
{
    public function index(Request $request): Response
    {
        $employeeId = $request->user()->employee_id;

        $records = AttendanceRecord::query()
            ->where('employee_id', $employeeId)
            ->orderBy('punch_time', 'desc')
            ->take(50)
            ->get()
            ->map(fn (AttendanceRecord $record) => [
                'id' => $record->id,
                'date' => $record->date,
                'punchTime' => $record->punch_time?->format('Y-m-d H:i:s') ?? $record->punch_time,
                'status' => $record->status,
            ]);

        $hasDevice = BiometricDevice::query()->where('is_active', true)->exists();

        $employee = \App\Models\Employee::find($employeeId);

        return Inertia::render('attendance', [
            'records' => $records,
            'employeeId' => $employeeId ?? '',
            'hasDevice' => $hasDevice,
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

        // Check if manual punch is enabled for this employee
        $employee = \App\Models\Employee::find($inputEmployeeId);
        if (! $employee?->manual_punch_enabled) {
            return back()->withErrors(['employee_id' => 'Manual attendance punch is not enabled for your account. Contact your supervisor.']);
        }

        $now = Carbon::now();

        AttendanceRecord::query()->create([
            'employee_id' => $inputEmployeeId,
            'date' => $now->toDateString(),
            'punch_time' => $now,
            'status' => 'Present',
            'source' => 'manual',
        ]);

        return back()->with('success', 'Attendance recorded successfully at '.$now->format('h:i A').'.');
    }

    public function updateManualPunchStatus(UpdateManualPunchStatusRequest $request, Employee $employee): RedirectResponse
    {
        $manualPunchEnabled = $request->boolean('manual_punch_enabled');

        $employee->update([
            'manual_punch_enabled' => $manualPunchEnabled,
        ]);

        $status = $manualPunchEnabled ? 'enabled' : 'disabled';

        return back()->with('success', "Manual punch {$status} for {$employee->name}.");
    }
}
