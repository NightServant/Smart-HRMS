<?php

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\Notification;
use App\Models\Seminars;
use App\Models\User;
use App\Services\AtreService;
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
