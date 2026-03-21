<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class AtreService
{
    /**
     * Get training recommendations based on seminars and criteria ratings.
     *
     * @param  array<int, array<string, mixed>>  $seminars
     * @param  array<string, string>  $criteriaRatings
     * @return array<string, mixed>
     */
    public function recommend(array $seminars, array $criteriaRatings): array
    {
        try {
            $input = json_encode([
                'action' => 'recommend',
                'payload' => [
                    'seminars' => $seminars,
                    'criteria_ratings' => $criteriaRatings,
                ],
            ]);

            Log::info('ATRE request', ['criteria_count' => count($criteriaRatings), 'seminar_count' => count($seminars)]);

            $result = Process::path(base_path('atre'))
                ->timeout(15)
                ->input($input)
                ->run('node bridge.cjs');

            if (! $result->successful()) {
                Log::error('ATRE bridge failed', [
                    'exitCode' => $result->exitCode(),
                    'output' => $result->output(),
                    'errorOutput' => $result->errorOutput(),
                ]);

                return [
                    'status' => 'error',
                    'recommendations' => [],
                    'risk_level' => 'NONE',
                    'risk_actions' => [],
                    'weak_areas' => [],
                    'notification' => 'ATRE service returned an error.',
                ];
            }

            $output = trim($result->output());
            $decoded = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('ATRE invalid JSON response', ['output' => $output]);

                return [
                    'status' => 'error',
                    'recommendations' => [],
                    'risk_level' => 'NONE',
                    'risk_actions' => [],
                    'weak_areas' => [],
                    'notification' => 'ATRE returned an invalid response.',
                ];
            }

            return $decoded;
        } catch (\Exception $e) {
            Log::error('ATRE service unavailable: '.$e->getMessage());

            return [
                'status' => 'error',
                'recommendations' => [],
                'risk_level' => 'NONE',
                'risk_actions' => [],
                'weak_areas' => [],
                'notification' => 'ATRE service is unavailable. Please try again later.',
            ];
        }
    }
}
