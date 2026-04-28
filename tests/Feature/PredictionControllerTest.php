<?php

use App\Models\DailyAttendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\HistoricalDataRecord;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use App\Models\User;
use App\Services\PpeService;
use Mockery\MockInterface;

test('evaluator can fetch predictive performance data for an employee', function () {
    $evaluator = User::factory()->asEvaluator()->create();

    foreach ([
        ['year' => 2024, 'period' => 'S1', 'score' => 4.10],
        ['year' => 2024, 'period' => 'S2', 'score' => 4.22],
        ['year' => 2025, 'period' => 'S1', 'score' => 4.35],
        ['year' => 2025, 'period' => 'S2', 'score' => 4.44],
    ] as $record) {
        HistoricalDataRecord::query()->create([
            'employee_name' => 'Alice Employee',
            'department_name' => 'Administrative Office',
            'year' => $record['year'],
            'quarter' => $record['period'] === 'S1' ? 'Q1' : 'Q3',
            'period' => $record['period'],
            'attendance_punctuality_rate' => '98%',
            'absenteeism_days' => 0,
            'tardiness_incidents' => 1,
            'training_completion_status' => 1,
            'evaluated_performance_score' => $record['score'],
        ]);
    }

    $this->mock(PpeService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('predict')
            ->once()
            ->with('Alice Employee', \Mockery::type('array'))
            ->andReturn([
                'status' => 'ok',
                'employee_name' => 'Alice Employee',
                'historical' => [
                    'labels' => ['2024-S1', '2024-S2', '2025-S1', '2025-S2'],
                    'scores' => [4.1, 4.22, 4.35, 4.44],
                    'yearly_labels' => ['2024', '2025'],
                    'yearly_scores' => [4.16, 4.4],
                ],
                'forecast' => [
                    'labels' => ['2026-S1', '2026-S2'],
                    'scores' => [4.68, 4.74],
                ],
                'trend' => 'IMPROVING',
                'recent_avg' => 4.28,
                'forecast_avg' => 4.74,
                'coefficients' => [],
            ]);
    });

    $this->actingAs($evaluator)
        ->getJson(route('api.predict', ['employee_name' => 'Alice Employee']))
        ->assertOk()
        ->assertJsonPath('status', 'ok')
        ->assertJsonPath('employee_name', 'Alice Employee')
        ->assertJsonCount(4, 'historical.labels');
});

test('employees cannot fetch predictive performance data from evaluator endpoint', function () {
    $employee = User::factory()->create();

    $this->actingAs($employee)
        ->getJson(route('api.predict', ['employee_name' => 'Alice Employee']))
        ->assertForbidden();
});

test('prediction endpoint prefers live IPCR and attendance data over duplicate csv history and returns target comparison rows', function () {
    $evaluator = User::factory()->asEvaluator()->create();
    $department = Department::query()->firstOrCreate(['name' => 'Administrative Office']);
    $position = EmployeePosition::query()->create([
        'name' => 'Administrative Aide I',
    ]);
    $employee = Employee::query()->create([
        'employee_id' => 'EMP-301',
        'name' => 'Bianca Employee',
        'job_title' => 'Administrative Aide I',
        'department_id' => $department->id,
        'position_id' => $position->id,
        'employment_status' => 'permanent',
        'date_hired' => '2024-01-10',
    ]);

    HistoricalDataRecord::query()->create([
        'employee_name' => 'Bianca Employee',
        'department_name' => 'Administrative Office',
        'year' => 2026,
        'quarter' => 'Q1',
        'period' => 'S1',
        'attendance_punctuality_rate' => '25%',
        'absenteeism_days' => 5,
        'tardiness_incidents' => 9,
        'training_completion_status' => 1,
        'evaluated_performance_score' => 2.40,
    ]);

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => [
            'sections' => [
                [
                    'rows' => [
                        ['accountable' => 'Complete routing targets within the semester.'],
                    ],
                ],
            ],
        ],
        'status' => 'finalized',
    ]);

    IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'status' => 'finalized',
        'stage' => 'finalized',
        'form_payload' => [
            'metadata' => [
                'period' => 'January to June 2026',
            ],
            'sections' => [
                [
                    'rows' => [
                        ['actual_accomplishment' => 'Completed routing targets with complete documentation.'],
                    ],
                ],
            ],
        ],
        'finalized_at' => now()->setDate(2026, 6, 30),
        'final_rating' => 4.55,
        'adjectival_rating' => 'Outstanding',
    ]);

    DailyAttendance::query()->create([
        'employee_id' => $employee->employee_id,
        'date' => '2026-02-10',
        'time_in' => '08:00:00',
        'time_out' => '17:00:00',
        'status' => 'on_time',
        'late_minutes' => 0,
        'source' => 'biometric',
    ]);
    DailyAttendance::query()->create([
        'employee_id' => $employee->employee_id,
        'date' => '2026-03-10',
        'time_in' => '08:12:00',
        'time_out' => '17:00:00',
        'status' => 'late',
        'late_minutes' => 12,
        'source' => 'biometric',
    ]);

    $this->actingAs($evaluator)
        ->getJson(route('api.predict', ['employee_name' => 'Bianca Employee']))
        ->assertOk()
        ->assertJsonPath('historical.records.0.source', 'live')
        ->assertJsonPath('historical.records.0.evaluated_performance_score', 4.55)
        ->assertJsonPath('historical.records.0.tardiness_incidents', 1)
        ->assertJsonPath('comparison.rows.0.achievement_label', 'Strongly Achieved')
        ->assertJsonPath('comparison.rows.0.period', 'S1')
        ->assertJsonPath('comparison.rows.0.target_items.0', 'Complete routing targets within the semester.')
        ->assertJsonPath('comparison.rows.0.actual_items.0', 'Completed routing targets with complete documentation.');
});
