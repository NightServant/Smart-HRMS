<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class IwrService
{
    public function routeIpcr(array $payload): array
    {
        return $this->call('route_ipcr', $payload);
    }

    public function routeLeave(array $payload): array
    {
        return $this->call('route_leave', $payload);
    }

    private function call(string $action, array $payload): array
    {
        try {
            $input = json_encode(['action' => $action, 'payload' => $payload]);

            Log::info('IWR request', ['action' => $action, 'payload' => $payload]);

            $result = Process::path(base_path('node-bridge'))
                ->timeout(30)
                ->input($input)
                ->run('node bridge.js');

            if (! $result->successful()) {
                Log::error('IWR bridge failed', [
                    'action' => $action,
                    'exitCode' => $result->exitCode(),
                    'output' => $result->output(),
                    'errorOutput' => $result->errorOutput(),
                ]);

                return [
                    'status' => 'error',
                    'notification' => 'IWR service returned an error.',
                ];
            }

            $output = trim($result->output());
            $decoded = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('IWR invalid JSON response', ['output' => $output]);

                return [
                    'status' => 'error',
                    'notification' => 'IWR returned an invalid response.',
                ];
            }

            return $decoded;
        } catch (\Exception $e) {
            Log::error('IWR service unavailable: '.$e->getMessage());

            return [
                'status' => 'error',
                'notification' => 'IWR service is unavailable. Please try again later.',
            ];
        }
    }
}
