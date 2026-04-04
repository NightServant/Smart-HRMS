<?php

use App\Models\HistoricalDataRecord;
use App\Models\User;
use App\Services\PpeService;
use Mockery\MockInterface;

test('evaluator can fetch predictive performance data for an employee', function () {
    $evaluator = User::factory()->asEvaluator()->create();

    HistoricalDataRecord::query()->create([
        'employee_name' => 'Alice Employee',
        'department_name' => 'Administrative Office',
        'year' => 2026,
        'quarter' => 'Q1',
        'period' => null,
        'attendance_punctuality_rate' => '98%',
        'absenteeism_days' => 0,
        'tardiness_incidents' => 1,
        'training_completion_status' => 1,
        'evaluated_performance_score' => 94.20,
    ]);

    $this->mock(PpeService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('predict')
            ->once()
            ->with('Alice Employee', \Mockery::on(function (array $records): bool {
                return count($records) === 1
                    && $records[0]['period'] === 'S1'
                    && $records[0]['evaluated_performance_score'] === 4.71;
            }))
            ->andReturn([
                'status' => 'ok',
                'employee_name' => 'Alice Employee',
                'historical' => [
                    'labels' => ['2026-S1'],
                    'scores' => [4.71],
                    'yearly_labels' => ['2026'],
                    'yearly_scores' => [4.71],
                ],
                'forecast' => [
                    'labels' => ['2026-S2'],
                    'scores' => [4.74],
                ],
                'trend' => 'IMPROVING',
                'recent_avg' => 4.71,
                'forecast_avg' => 4.74,
                'coefficients' => [],
            ]);
    });

    $this->actingAs($evaluator)
        ->getJson(route('api.predict', ['employee_name' => 'Alice Employee']))
        ->assertOk()
        ->assertJsonPath('status', 'ok')
        ->assertJsonPath('employee_name', 'Alice Employee');
});

test('administrator cannot fetch predictive performance data from evaluator endpoint', function () {
    $administrator = User::factory()->asAdministrator()->create();

    $this->actingAs($administrator)
        ->getJson(route('api.predict', ['employee_name' => 'Alice Employee']))
        ->assertForbidden();
});
