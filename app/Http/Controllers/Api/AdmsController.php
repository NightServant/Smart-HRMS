<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessAttendanceBatch;
use App\Models\AttendanceRecord;
use App\Models\BiometricDevice;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
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

        if (! preg_match('/^[A-Za-z0-9\-_]{1,50}$/', (string) $sn)) {
            return response('Invalid SN', 400, ['Content-Type' => 'text/plain']);
        }

        if ($request->isMethod('get')) {
            return $this->handleHandshake($request, (string) $sn);
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
            if (! preg_match('/^[A-Za-z0-9\-_]{1,50}$/', (string) $sn)) {
                return response('Invalid SN', 400, ['Content-Type' => 'text/plain']);
            }

            $device = $this->resolveDevice((string) $sn, $request);

            if (! $device) {
                return response('Device not registered', 403, ['Content-Type' => 'text/plain']);
            }

            $device->update(['last_activity_at' => now()]);
        }

        return response('OK', 200, ['Content-Type' => 'text/plain']);
    }

    /**
     * Device reports command results.
     */
    public function deviceCmd(Request $request): Response
    {
        Log::info('ADMS devicecmd', ['SN' => $request->query('SN'), 'body_length' => strlen($request->getContent())]);

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

    /**
     * Accept attendance logs from the local Node.js middleware bridge (Mode 2).
     * Expects JSON: { serialNumber, records: [{ pin, datetime }] }
     */
    public function middlewarePush(Request $request): JsonResponse
    {
        $data = $request->validate([
            'serialNumber' => 'required|string|max:50',
            'records' => 'required|array|min:1',
            'records.*.pin' => 'required|string|max:50',
            'records.*.datetime' => 'required|string',
        ]);

        if (! preg_match('/^[A-Za-z0-9\-_]{1,50}$/', $data['serialNumber'])) {
            return response()->json(['error' => 'Invalid serial number'], 400);
        }

        $device = $this->resolveDevice($data['serialNumber'], $request);

        if (! $device) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        ProcessAttendanceBatch::dispatch($device->id, $data['records']);

        return response()->json(['status' => 'queued', 'count' => count($data['records'])]);
    }

    /**
     * Resolve and authenticate a device by serial number.
     * If the device has an api_key set, the request must supply a matching Bearer token.
     * Devices without an api_key are authenticated by serial number alone (backward-compatible).
     */
    private function resolveDevice(string $sn, Request $request): ?BiometricDevice
    {
        $device = BiometricDevice::query()
            ->where('serial_number', $sn)
            ->where('is_active', true)
            ->first();

        if (! $device) {
            return null;
        }

        if ($device->api_key) {
            $provided = $request->bearerToken() ?? '';

            if (! hash_equals($device->api_key, $provided)) {
                Log::warning('ADMS: Invalid API key', ['SN' => $sn, 'ip' => $request->ip()]);

                return null;
            }
        }

        return $device;
    }

    private function handleHandshake(Request $request, string $sn): Response
    {
        $device = $this->resolveDevice($sn, $request);

        if (! $device) {
            return response('Device not registered', 403, ['Content-Type' => 'text/plain']);
        }

        $device->update(['last_activity_at' => now()]);

        $options = implode("\r\n", [
            "GET OPTION FROM: {$sn}",
            'Stamp='.($device->last_sync_stamp ?? 0),
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
        $device = $this->resolveDevice($sn, $request);

        if (! $device) {
            return response('Device not registered or inactive', 403, ['Content-Type' => 'text/plain']);
        }

        $device->update(['last_activity_at' => now()]);

        $body = $request->getContent();
        $lines = array_filter(explode("\n", $body), fn (string $line): bool => trim($line) !== '');

        $records = [];

        foreach ($lines as $line) {
            $fields = explode("\t", trim($line));

            if (count($fields) < 2) {
                Log::warning('ADMS: Malformed attendance line', ['line' => $line, 'SN' => $sn]);

                continue;
            }

            $records[] = [
                'pin' => trim($fields[0]),
                'datetime' => $fields[1],
            ];
        }

        if (! empty($records)) {
            ProcessAttendanceBatch::dispatch(
                $device->id,
                $records,
                $request->query('Stamp'),
            );
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
