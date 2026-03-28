<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class AdmsController extends Controller
{
    /**
     * Handle ADMS cdata requests.
     * GET  = device handshake/registration
     * POST = device pushes attendance logs
     */
    public function cdata(Request $request): Response
    {
        if (! config('services.biometric.enabled')) {
            return response('Disabled', 404, ['Content-Type' => 'text/plain']);
        }

        $sn = $request->query('SN');

        if (! $sn) {
            return response('Missing SN', 400, ['Content-Type' => 'text/plain']);
        }

        if ($request->isMethod('get')) {
            return $this->handleHandshake((string) $sn);
        }

        return $this->handleAttendancePush($request, (string) $sn);
    }

    /**
     * Device polls for pending commands.
     */
    public function getRequest(Request $request): Response
    {
        $sn = $request->query('SN');

        if ($sn) {
            BiometricDevice::query()
                ->where('serial_number', $sn)
                ->update(['last_activity_at' => now()]);
        }

        return response('OK', 200, ['Content-Type' => 'text/plain']);
    }

    /**
     * Device reports command results.
     */
    public function deviceCmd(Request $request): Response
    {
        Log::info('ADMS devicecmd', ['body' => $request->getContent(), 'SN' => $request->query('SN')]);

        return response('OK', 200, ['Content-Type' => 'text/plain']);
    }

    /**
     * Biometric punch simulation for employees (web route).
     */
    public function simulate(Request $request): RedirectResponse
    {
        $user = $request->user();
        $employeeId = $user->employee_id;

        if (! $employeeId) {
            return back()->withErrors(['employee_id' => 'No employee ID linked to your account.']);
        }

        $employee = Employee::find($employeeId);

        if (! $employee) {
            return back()->withErrors(['employee_id' => 'Employee record not found.']);
        }

        // Find or create the SIMULATOR device
        $device = BiometricDevice::query()->firstOrCreate(
            ['serial_number' => 'SIMULATOR'],
            ['name' => 'Web Simulator', 'is_active' => true],
        );

        $now = Carbon::now();

        $record = $this->createAttendanceRecord($employee->employee_id, $now, $device);

        if (! $record) {
            return back()->withErrors(['employee_id' => 'Attendance already recorded for this timestamp.']);
        }

        return back()->with('success', 'Biometric punch recorded at '.$now->format('h:i A').' — '.$record->status.'.');
    }

    private function handleHandshake(string $sn): Response
    {
        $device = BiometricDevice::query()->firstOrCreate(
            ['serial_number' => $sn],
            ['name' => null, 'is_active' => true],
        );

        $device->update(['last_activity_at' => now()]);

        $options = implode("\r\n", [
            "GET OPTION FROM: {$sn}",
            'Stamp=0',
            'OpStamp=0',
            'PhotoStamp=0',
            'ErrorDelay=60',
            'Delay=30',
            'TransTimes=00:00;14:05',
            'TransInterval=1',
            'TransFlag=TransData AttLog',
            'Realtime=1',
            'Encrypt=0',
        ]);

        return response($options, 200, ['Content-Type' => 'text/plain']);
    }

    private function handleAttendancePush(Request $request, string $sn): Response
    {
        $device = BiometricDevice::query()->where('serial_number', $sn)->first();

        if (! $device || ! $device->is_active) {
            return response('Device not registered or inactive', 403, ['Content-Type' => 'text/plain']);
        }

        $device->update(['last_activity_at' => now()]);

        $body = $request->getContent();
        $lines = array_filter(explode("\n", $body), fn (string $line): bool => trim($line) !== '');

        $synced = 0;

        foreach ($lines as $line) {
            $fields = explode("\t", trim($line));

            if (count($fields) < 2) {
                Log::warning('ADMS: Malformed attendance line', ['line' => $line, 'SN' => $sn]);

                continue;
            }

            $pin = $fields[0];
            $dateTimeStr = $fields[1];

            try {
                $punchDateTime = Carbon::parse($dateTimeStr);
            } catch (\Exception $e) {
                Log::warning('ADMS: Invalid datetime', ['datetime' => $dateTimeStr, 'SN' => $sn]);

                continue;
            }

            $employee = Employee::find($pin);

            if (! $employee) {
                Log::warning('ADMS: Unknown PIN (employee_id)', ['pin' => $pin, 'SN' => $sn]);

                continue;
            }

            $record = $this->createAttendanceRecord($employee->employee_id, $punchDateTime, $device);

            if ($record) {
                $synced++;
            }
        }

        $device->increment('records_synced', $synced);

        if ($request->query('Stamp')) {
            $device->update(['last_sync_stamp' => $request->query('Stamp')]);
        }

        return response('OK', 200, ['Content-Type' => 'text/plain']);
    }

    private function createAttendanceRecord(string $employeeId, Carbon $punchDateTime, BiometricDevice $device): ?AttendanceRecord
    {
        $status = $punchDateTime->hour >= 9 ? 'Late' : 'Present';

        return AttendanceRecord::query()->firstOrCreate(
            [
                'employee_id' => $employeeId,
                'punch_time' => $punchDateTime,
            ],
            [
                'date' => $punchDateTime->toDateString(),
                'status' => $status,
                'source' => 'biometric',
            ],
        );
    }
}
