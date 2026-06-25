<?php

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\Notification;
use App\Models\Seminars;
use App\Models\User;
use App\Services\AtreService;
use App\Services\EmployeePredictionService;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery\MockInterface;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $employee = Employee::query()->create([
        'employee_id' => 'EMP-999',
        'name' => 'Surface Test Employee',
        'job_title' => 'Administrative Aide I',
        'supervisor_id' => null,
    ]);

    $user = User::factory()->create([
        'name' => $employee->name,
        'employee_id' => $employee->employee_id,
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $unnotifiedEmployee = Employee::query()->create([
        'employee_id' => 'EMP-998',
        'name' => 'Unnotified Employee',
        'job_title' => 'Administrative Aide II',
        'supervisor_id' => null,
    ]);

    $unnotifiedUser = User::factory()->create([
        'name' => $unnotifiedEmployee->name,
        'employee_id' => $unnotifiedEmployee->employee_id,
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $firstSubmission = IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.25,
        'form_payload' => [
            'template_version' => 'v1',
            'metadata' => [],
            'sections' => [
                [
                    'id' => 'section-1',
                    'title' => 'Administrative Services',
                    'rows' => [
                        [
                            'id' => 'row-1',
                            'target' => 'Customer service delivery',
                            'average' => 4.25,
                        ],
                    ],
                ],
            ],
            'workflow_notes' => [],
            'summary' => [
                'computed_rating' => 4.25,
            ],
        ],
        'status' => 'finalized',
        'stage' => 'finalized',
    ]);

    IpcrSubmission::query()->create([
        'employee_id' => $unnotifiedEmployee->employee_id,
        'performance_rating' => 4.25,
        'form_payload' => [
            'template_version' => 'v1',
            'metadata' => [],
            'sections' => [
                [
                    'id' => 'section-1',
                    'title' => 'Administrative Services',
                    'rows' => [
                        [
                            'id' => 'row-1',
                            'target' => 'Customer service delivery',
                            'average' => 4.25,
                        ],
                    ],
                ],
            ],
            'workflow_notes' => [],
            'summary' => [
                'computed_rating' => 4.25,
            ],
        ],
        'status' => 'finalized',
        'stage' => 'finalized',
    ]);

    Seminars::query()->create([
        'title' => 'Customer Service Excellence',
        'description' => 'Service skills workshop.',
        'target_performance_area' => 'Customer service delivery',
        'rating_tier' => '3-4',
        'date' => '2026-04-01',
    ]);

    Notification::query()->create([
        'user_id' => $user->id,
        'type' => 'training_suggestion',
        'title' => 'Training Recommendation',
        'message' => 'HR opened training discovery for your latest Performance Evaluation. Review the recommended seminars tied to your Administrative Office service areas.',
        'document_type' => 'ipcr',
        'document_id' => $firstSubmission->id,
        'is_important' => true,
    ]);

    $this->mock(AtreService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('recommend')
            ->once()
            ->with(
                \Mockery::on(function (array $seminars): bool {
                    return count($seminars) === 1
                        && $seminars[0]['title'] === 'Customer Service Excellence'
                        && $seminars[0]['rating_tier'] === '3-4';
                }),
                \Mockery::on(function (array $formPayload): bool {
                    return ($formPayload['summary']['computed_rating'] ?? null) === 4.25;
                }),
            )
            ->andReturn([
                'status' => 'ok',
                'recommendations' => [
                    [
                        'seminar_id' => 1,
                        'title' => 'Customer Service Excellence',
                        'description' => 'Service skills workshop.',
                        'target_performance_area' => 'Customer service delivery',
                        'rating_tier' => '3-4',
                        'score' => 1.5,
                        'priority' => 'MEDIUM',
                        'matched_area' => 'Administrative Services',
                    ],
                ],
                'risk_level' => 'MEDIUM',
                'risk_actions' => [],
                'weak_areas' => [],
            ]);
    });

    $this->actingAs($user);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->has('recommendations', 1)
        ->where('recommendations.0.title', 'Customer Service Excellence')
        ->where('riskLevel', 'MEDIUM'));

    $olderSubmission = IpcrSubmission::query()->create([
        'employee_id' => $unnotifiedEmployee->employee_id,
        'performance_rating' => 4.25,
        'form_payload' => [
            'template_version' => 'v1',
            'metadata' => [],
            'sections' => [
                [
                    'id' => 'section-1',
                    'title' => 'Administrative Services',
                    'rows' => [
                        [
                            'id' => 'row-1',
                            'target' => 'Customer service delivery',
                            'average' => 4.25,
                        ],
                    ],
                ],
            ],
            'workflow_notes' => [],
            'summary' => [
                'computed_rating' => 4.25,
            ],
        ],
        'status' => 'finalized',
        'stage' => 'finalized',
    ]);

    IpcrSubmission::query()->create([
        'employee_id' => $unnotifiedEmployee->employee_id,
        'performance_rating' => 4.25,
        'form_payload' => [
            'template_version' => 'v1',
            'metadata' => [],
            'sections' => [
                [
                    'id' => 'section-1',
                    'title' => 'Administrative Services',
                    'rows' => [
                        [
                            'id' => 'row-1',
                            'target' => 'Customer service delivery',
                            'average' => 4.25,
                        ],
                    ],
                ],
            ],
            'workflow_notes' => [],
            'summary' => [
                'computed_rating' => 4.25,
            ],
        ],
        'status' => 'finalized',
        'stage' => 'finalized',
    ]);

    Notification::query()->create([
        'user_id' => $unnotifiedUser->id,
        'type' => 'training_suggestion',
        'title' => 'Training Recommendation',
        'message' => 'HR opened training discovery for a previous submission.',
        'document_type' => 'ipcr',
        'document_id' => $olderSubmission->id,
        'is_important' => true,
    ]);

    $this->actingAs($unnotifiedUser)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('recommendations', [])
            ->where('riskLevel', 'NONE'));
});

test('employee dashboard receives the unified prediction payload used by evaluator and hr views', function () {
    $employee = Employee::query()->create([
        'employee_id' => 'EMP-021',
        'name' => 'Theresa Evangelista',
        'job_title' => 'Administrative Aide I',
        'supervisor_id' => null,
    ]);

    $user = User::factory()->create([
        'name' => $employee->name,
        'employee_id' => $employee->employee_id,
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $this->mock(AtreService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('recommend')->never();
    });

    $this->mock(EmployeePredictionService::class, function (MockInterface $mock) use ($employee): void {
        $mock->shouldReceive('build')
            ->once()
            ->with(\Mockery::on(fn (Employee $subject): bool => $subject->is($employee)))
            ->andReturn([
                'status' => 'ok',
                'employee_name' => 'Theresa Evangelista',
                'historical' => [
                    'labels' => ['2025-S1', '2025-S2', '2026-S1', '2026-S2'],
                    'scores' => [3.45, 3.68, 3.91, 4.1],
                    'yearly_labels' => ['2025', '2026'],
                    'yearly_scores' => [3.57, 4.01],
                    'records' => [
                        [
                            'year' => 2026,
                            'period' => 'S1',
                            'attendance_punctuality_rate' => 92.5,
                            'absenteeism_days' => 0,
                            'tardiness_incidents' => 1,
                            'training_completion_status' => 0,
                            'evaluated_performance_score' => 3.91,
                            'source' => 'live',
                        ],
                    ],
                ],
                'forecast' => [
                    'labels' => ['2027-S1', '2027-S2'],
                    'scores' => [4.12, 4.18],
                ],
                'comparison' => [
                    'rows' => [
                        [
                            'year' => 2026,
                            'period' => 'S1',
                            'evaluation_score' => 3.91,
                            'achievement_status' => 'strongly_achieved',
                            'achievement_label' => 'Strongly Achieved',
                            'target_items' => ['Complete semester targets'],
                            'actual_items' => ['Completed semester targets'],
                            'attendance_punctuality_rate' => 92.5,
                            'tardiness_incidents' => 1,
                            'on_time_days' => 18,
                            'late_days' => 1,
                            'incomplete_days' => 0,
                            'complete_days' => 19,
                            'recorded_days' => 19,
                            'source' => 'live',
                        ],
                    ],
                ],
                'trend' => 'IMPROVING',
                'recent_avg' => 3.79,
                'forecast_avg' => 4.15,
                'coefficients' => [],
            ]);
    });

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('employeeProfile.employee_id', 'EMP-021')
            ->where('prediction.employee_name', 'Theresa Evangelista')
            ->where('prediction.historical.records.0.source', 'live')
            ->where('prediction.comparison.rows.0.achievement_label', 'Strongly Achieved')
            ->where('prediction.comparison.rows.0.target_items.0', 'Complete semester targets')
            ->where('prediction.comparison.rows.0.actual_items.0', 'Completed semester targets'));
});
