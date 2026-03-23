<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class PpeService
{
    /**
     * Predict future performance for an employee using Linear Regression.
     *
     * @param  array<int, array<string, mixed>>  $records
     * @return array<string, mixed>
     */
    public function predict(string $employeeName, array $records): array
    {
        try {
            $input = json_encode([
                'action' => 'predict',
                'payload' => [
                    'employee_name' => $employeeName,
                    'records' => $records,
                ],
            ]);

            Log::info('PPE request', ['employee' => $employeeName, 'record_count' => count($records)]);

            $result = Process::path(base_path('python/ppe'))
                ->timeout(15)
                ->input($input)
                ->run('node bridge.cjs');

            if (! $result->successful()) {
                Log::error('PPE bridge failed', [
                    'exitCode' => $result->exitCode(),
                    'output' => $result->output(),
                    'errorOutput' => $result->errorOutput(),
                ]);

                return [
                    'status' => 'error',
                    'notification' => 'PPE service returned an error.',
                ];
            }

            $output = trim($result->output());
            $decoded = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('PPE invalid JSON response', ['output' => $output]);

                return [
                    'status' => 'error',
                    'notification' => 'PPE returned an invalid response.',
                ];
            }

            return $decoded;
        } catch (\Exception $e) {
            Log::error('PPE service unavailable: '.$e->getMessage());

            return [
                'status' => 'error',
                'notification' => 'PPE service is unavailable. Please try again later.',
            ];
        }
    }
}
