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

    public function routeHrReview(array $payload): array
    {
        return $this->call('route_hr_review', $payload);
    }

    public function routeAppeal(array $payload): array
    {
        return $this->call('route_appeal', $payload);
    }

    public function routePmtReview(array $payload): array
    {
        return $this->call('route_pmt_review', $payload);
    }

    public function finalizeIpcr(array $payload): array
    {
        return $this->call('finalize_ipcr', $payload);
    }

    private function call(string $action, array $payload): array
    {
        try {
            $input = json_encode(['action' => $action, 'payload' => $payload]);

            Log::info('IWR request', ['action' => $action, 'payload' => $payload]);

            $result = Process::path(base_path('python/iwr'))
                ->timeout(30)
                ->input($input)
                ->run('node bridge.cjs');

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
