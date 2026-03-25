<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class FlatFatService
{
    /**
     * Calculate performance score for a single employee.
     *
     * @param string $employeeId Employee ID
     * @param array $data Employee metrics (performance_rating, attendance_pct, task_completion_pct)
     * @param string|null $quarter Quarter string (Q1, Q2, Q3, Q4)
     * @return array Score with breakdown and risk status
     */
    public function calculateEmployeeScore(string $employeeId, array $data, ?string $quarter = null): array
    {
        try {
            $input = json_encode([
                'action' => 'employee_score',
                'payload' => [
                    'employee_id' => $employeeId,
                    'data' => $data,
                    'quarter' => $quarter,
                ],
            ]);

            Log::info('FlatFAT employee score request', ['employee_id' => $employeeId]);

            $result = Process::path(base_path('python/rt-hr-dashboard'))
                ->timeout(30)
                ->input($input)
                ->run('node bridge.cjs');

            if (! $result->successful()) {
                Log::error('FlatFAT bridge failed', [
                    'exitCode' => $result->exitCode(),
                    'output' => $result->output(),
                    'errorOutput' => $result->errorOutput(),
                ]);

                return [
                    'status' => 'error',
                    'employee_id' => $employeeId,
                    'final_rating' => 0,
                    'risk_status' => 'Unknown',
                    'notification' => 'FlatFAT service returned an error.',
                ];
            }

            $output = trim($result->output());
            $decoded = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('FlatFAT invalid JSON response', ['output' => $output, 'employee_id' => $employeeId]);

                return [
                    'status' => 'error',
                    'employee_id' => $employeeId,
                    'final_rating' => 0,
                    'risk_status' => 'Unknown',
                    'notification' => 'FlatFAT returned an invalid response.',
                ];
            }

            return $decoded;
        } catch (\Exception $e) {
            Log::error('FlatFAT service error: '.$e->getMessage(), ['employee_id' => $employeeId]);

            return [
                'status' => 'error',
                'employee_id' => $employeeId,
                'final_rating' => 0,
                'risk_status' => 'Unknown',
                'notification' => 'FlatFAT service is unavailable. Please try again later.',
            ];
        }
    }

    /**
     * Aggregate performance scores by department.
     *
     * @param string $departmentId Department ID
     * @param array $employeeScores List of employee score arrays
     * @param string|null $quarter Quarter string
     * @return array Aggregated department metrics
     */
    public function calculateDepartmentAggregate(string $departmentId, array $employeeScores, ?string $quarter = null): array
    {
        try {
            $input = json_encode([
                'action' => 'department_aggregate',
                'payload' => [
                    'department_id' => $departmentId,
                    'employee_scores' => $employeeScores,
                    'quarter' => $quarter,
                ],
            ]);

            Log::info('FlatFAT department aggregate request', [
                'department_id' => $departmentId,
                'employee_count' => count($employeeScores),
            ]);

            $result = Process::path(base_path('python/rt-hr-dashboard'))
                ->timeout(30)
                ->input($input)
                ->run('node bridge.cjs');

            if (! $result->successful()) {
                Log::error('FlatFAT department aggregate failed', [
                    'exitCode' => $result->exitCode(),
                    'output' => $result->output(),
                    'errorOutput' => $result->errorOutput(),
                ]);

                return [
                    'status' => 'error',
                    'department_id' => $departmentId,
                    'total_employees' => 0,
                    'average_rating' => 0,
                    'notification' => 'FlatFAT department aggregate failed.',
                ];
            }

            $output = trim($result->output());
            $decoded = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('FlatFAT invalid aggregate response', ['output' => $output, 'department_id' => $departmentId]);

                return [
                    'status' => 'error',
                    'department_id' => $departmentId,
                    'total_employees' => 0,
                    'average_rating' => 0,
                    'notification' => 'FlatFAT returned an invalid response.',
                ];
            }

            return $decoded;
        } catch (\Exception $e) {
            Log::error('FlatFAT department aggregate error: '.$e->getMessage());

            return [
                'status' => 'error',
                'department_id' => $departmentId,
                'total_employees' => 0,
                'average_rating' => 0,
                'notification' => 'FlatFAT service is unavailable.',
            ];
        }
    }

    /**
     * Aggregate performance scores organization-wide.
     *
     * @param array $employeeScores List of employee score arrays
     * @param string|null $quarter Quarter string
     * @return array Organization-wide aggregate metrics
     */
    public function calculateOrganizationAggregate(array $employeeScores, ?string $quarter = null): array
    {
        try {
            $input = json_encode([
                'action' => 'organization_aggregate',
                'payload' => [
                    'employee_scores' => $employeeScores,
                    'quarter' => $quarter,
                ],
            ]);

            Log::info('FlatFAT organization aggregate request', [
                'employee_count' => count($employeeScores),
            ]);

            $result = Process::path(base_path('python/rt-hr-dashboard'))
                ->timeout(30)
                ->input($input)
                ->run('node bridge.cjs');

            if (! $result->successful()) {
                Log::error('FlatFAT organization aggregate failed', [
                    'exitCode' => $result->exitCode(),
                    'output' => $result->output(),
                    'errorOutput' => $result->errorOutput(),
                ]);

                return [
                    'status' => 'error',
                    'scope' => 'organization',
                    'total_employees' => 0,
                    'average_rating' => 0,
                    'notification' => 'FlatFAT organization aggregate failed.',
                ];
            }

            $output = trim($result->output());
            $decoded = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('FlatFAT invalid organization response', ['output' => $output]);

                return [
                    'status' => 'error',
                    'scope' => 'organization',
                    'total_employees' => 0,
                    'average_rating' => 0,
                    'notification' => 'FlatFAT returned an invalid response.',
                ];
            }

            return $decoded;
        } catch (\Exception $e) {
            Log::error('FlatFAT organization aggregate error: '.$e->getMessage());

            return [
                'status' => 'error',
                'scope' => 'organization',
                'total_employees' => 0,
                'average_rating' => 0,
                'notification' => 'FlatFAT service is unavailable.',
            ];
        }
    }
}
