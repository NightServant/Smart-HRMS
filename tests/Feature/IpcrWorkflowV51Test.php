<?php

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\Notification;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\IpcrFormTemplateService;
use App\Services\IwrService;
use Inertia\Testing\AssertableInertia as Assert;

function seedIpcrUsersAndEmployees(): array
{
    $departmentHead = Employee::query()->create([
        'employee_id' => 'EMP-001',
        'name' => 'John Reyes',
        'job_title' => 'Department Head',
        'supervisor_id' => null,
    ]);

    $employee = Employee::query()->create([
        'employee_id' => 'EMP-005',
        'name' => 'Patricia Garcia',
        'job_title' => 'Administrative Aide I',
        'supervisor_id' => $departmentHead->employee_id,
    ]);

    $hrEmployee = Employee::query()->create([
        'employee_id' => 'HR-001',
        'name' => 'Helena Reyes',
        'job_title' => 'HR Officer',
        'supervisor_id' => null,
    ]);

    $pmtEmployee = Employee::query()->create([
        'employee_id' => 'PMT-001',
        'name' => 'Paolo Matias',
        'job_title' => 'PMT Chair',
        'supervisor_id' => null,
    ]);

    $employeeUser = User::factory()->create([
        'name' => $employee->name,
        'email' => 'employee@example.com',
        'employee_id' => $employee->employee_id,
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $evaluatorUser = User::factory()->asEvaluator()->create([
        'name' => $departmentHead->name,
        'email' => 'evaluator@example.com',
        'employee_id' => $departmentHead->employee_id,
    ]);

    $hrUser = User::factory()->asHrPersonnel()->create([
        'name' => $hrEmployee->name,
        'email' => 'hr@example.com',
        'employee_id' => $hrEmployee->employee_id,
    ]);

    $pmtUser = User::factory()->asPmt()->create([
        'name' => $pmtEmployee->name,
        'email' => 'pmt@example.com',
        'employee_id' => $pmtEmployee->employee_id,
    ]);

    return compact('employee', 'employeeUser', 'evaluatorUser', 'hrUser', 'pmtUser');
}

function employeeFormPayload(Employee $employee): array
{
    $service = app(IpcrFormTemplateService::class);
    $payload = $service->draft($employee, 'January to June 2026');

    foreach ($payload['sections'] as $sectionIndex => $section) {
        foreach ($section['rows'] as $rowIndex => $row) {
            $payload['sections'][$sectionIndex]['rows'][$rowIndex]['actual_accomplishment'] = 'Completed and documented.';
        }
    }

    return $service->hydrate($payload, $employee);
}

function evaluatorFormPayload(Employee $employee, float $rating = 4.0): array
{
    $service = app(IpcrFormTemplateService::class);
    $payload = employeeFormPayload($employee);

    foreach ($payload['sections'] as $sectionIndex => $section) {
        foreach ($section['rows'] as $rowIndex => $row) {
            $payload['sections'][$sectionIndex]['rows'][$rowIndex]['ratings'] = [
                'quality' => $rating,
                'efficiency' => $rating,
                'timeliness' => $rating,
            ];
            $payload['sections'][$sectionIndex]['rows'][$rowIndex]['remarks'] = 'Validated by evaluator.';
        }
    }

    return $service->hydrate($payload, $employee);
}

function createSentToHrSubmission(Employee $employee, string $evaluatorId = 'EMP-001', float $rating = 4.0): IpcrSubmission
{
    return IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => $rating,
        'form_payload' => evaluatorFormPayload($employee, $rating),
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'sent_to_hr',
        'routing_action' => 'route_to_hr',
        'evaluator_id' => $evaluatorId,
        'notification' => 'Evaluation saved and routed to HR for checking.',
        'rejection_reason' => 'Evaluator remarks',
    ]);
}

function createAppealWindowSubmission(Employee $employee): IpcrSubmission
{
    return IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.0,
        'form_payload' => evaluatorFormPayload($employee, 4.0),
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'appeal_window_open',
        'routing_action' => 'open_appeal_window',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Appeal window opened.',
        'appeal_status' => 'appeal_window_open',
        'appeal_window_opens_at' => now(),
        'appeal_window_closes_at' => now()->addHours(12),
        'hr_remarks' => 'HR approved the computation.',
    ]);
}

function createSentToPmtSubmission(Employee $employee, string $appealStatus = 'no_appeal'): IpcrSubmission
{
    return IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.0,
        'form_payload' => evaluatorFormPayload($employee, 4.0),
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'sent_to_pmt',
        'routing_action' => 'route_to_pmt',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Routed to PMT review.',
        'appeal_status' => $appealStatus,
    ]);
}

/**
 * Mock IwrService to return predictable results without requiring
 * the Python bridge (which needs Node.js in the test environment PATH).
 */
function mockIwrService(array $methodResults): void
{
    $mock = Mockery::mock(IwrService::class);

    foreach ($methodResults as $method => $result) {
        $mock->shouldReceive($method)->once()->andReturn($result);
    }

    app()->instance(IwrService::class, $mock);
}

test('evaluator submission requires remarks and routes to hr', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser, 'evaluatorUser' => $evaluatorUser] = seedIpcrUsersAndEmployees();
    $evaluatorUser->update(['name' => 'Mark Reyes']);

    SystemSetting::set('ipcr_period_open', 'true', $employeeUser->id);
    SystemSetting::set('ipcr_period_label', 'January to June 2026', $employeeUser->id);

    mockIwrService(['routeIpcr' => [
        'status' => 'routed',
        'stage' => 'sent_to_evaluator',
        'routing_action' => 'route_to_evaluator',
        'evaluator_id' => 'EMP-001',
        'evaluator_name' => 'John Reyes',
        'confidence_pct' => 100.0,
        'notification' => 'IPCR form sent to John Reyes for evaluation.',
    ]]);

    $this->actingAs($employeeUser)->post(route('ipcr.submit'), [
        'employee_id' => $employee->employee_id,
        'period' => 'January to June 2026',
        'form_payload' => employeeFormPayload($employee),
    ])->assertRedirect(route('submit-evaluation'));

    // Re-mock for evaluation step
    mockIwrService(['routeIpcr' => [
        'status' => 'completed',
        'stage' => 'data_saved',
        'routing_action' => 'save_data',
        'evaluator_id' => 'EMP-001',
        'confidence_pct' => 100.0,
        'notification' => 'IPCR evaluation complete. Data saved.',
    ]]);

    $this->actingAs($evaluatorUser)->post(route('ipcr.evaluate'), [
        'employee_id' => $employee->employee_id,
        'confirmed' => true,
        'remarks' => 'Evaluator remarks are complete.',
        'form_payload' => evaluatorFormPayload($employee, 4.0),
    ])->assertRedirect(route('document-management'));

    $submission = IpcrSubmission::query()->latest()->firstOrFail();

    expect($submission->stage)->toBe('sent_to_hr')
        ->and($submission->status)->toBe('routed')
        ->and((float) $submission->performance_rating)->toBe(4.0)
        ->and(data_get($submission->form_payload, 'sign_off.reviewed_by_name'))->toBe('Mark Reyes');

    $this->actingAs($employeeUser)
        ->get(route('submit-evaluation'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('latestSubmission.form_payload.sign_off.reviewed_by_name', 'Mark Reyes')
        );
});

test('employee sees a workflow error when ipcr routing is unavailable', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_open', 'true', $employeeUser->id);
    SystemSetting::set('ipcr_period_label', 'January to June 2026', $employeeUser->id);

    mockIwrService(['routeIpcr' => [
        'status' => 'error',
        'notification' => 'IWR service is unavailable. Please try again later.',
    ]]);

    $this->actingAs($employeeUser)->post(route('ipcr.submit'), [
        'employee_id' => $employee->employee_id,
        'period' => 'January to June 2026',
        'form_payload' => employeeFormPayload($employee),
    ])->assertRedirect(route('submit-evaluation'))
        ->assertSessionHasErrors(['workflow']);

    $submission = IpcrSubmission::query()->latest()->firstOrFail();

    expect($submission->status)->toBe('error')
        ->and($submission->notification)->toBe('IWR service is unavailable. Please try again later.');
});

test('hr approve opens the appeal window', function () {
    ['employee' => $employee, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToHrSubmission($employee);

    mockIwrService(['routeHrReview' => [
        'status' => 'routed',
        'stage' => 'appeal_window_open',
        'routing_action' => 'open_appeal_window',
        'appeal_window_hours' => 72,
        'notification' => 'HR approved IPCR. Appeal window opened for 72 hours.',
    ]]);

    $this->actingAs($hrUser)->post(route('ipcr.hr-review', $submission), [
        'hr_decision' => 'approved',
        'hr_remarks' => null,
    ])->assertRedirect(route('admin.hr-review'));

    $submission->refresh();

    expect($submission->stage)->toBe('appeal_window_open')
        ->and($submission->appeal_status)->toBe('appeal_window_open')
        ->and($submission->appeal_window_closes_at)->not->toBeNull();
});

test('hr reject first cycle returns to evaluator', function () {
    ['employee' => $employee, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToHrSubmission($employee);

    mockIwrService(['routeHrReview' => [
        'status' => 'routed',
        'stage' => 'sent_to_evaluator',
        'routing_action' => 're_evaluate',
        'notification' => 'HR returned IPCR to the evaluator for correction.',
    ]]);

    $this->actingAs($hrUser)->post(route('ipcr.hr-review', $submission), [
        'hr_decision' => 'rejected',
        'hr_remarks' => 'Please correct the supporting computation.',
    ])->assertRedirect(route('admin.hr-review'));

    $submission->refresh();

    expect($submission->stage)->toBe('sent_to_evaluator')
        ->and($submission->hr_cycle_count)->toBe(1)
        ->and($submission->is_escalated)->toBeFalse();
});

test('hr reject second cycle escalates the submission', function () {
    ['employee' => $employee, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToHrSubmission($employee);
    $submission->update(['hr_cycle_count' => 1]);

    mockIwrService(['routeHrReview' => [
        'status' => 'escalated',
        'stage' => 'escalated',
        'routing_action' => 'escalate',
        'escalation_reason' => 'HR review cycle limit reached',
        'notification' => 'IPCR escalated — HR review cycle limit reached.',
    ]]);

    $this->actingAs($hrUser)->post(route('ipcr.hr-review', $submission), [
        'hr_decision' => 'rejected',
        'hr_remarks' => 'Escalation required after repeated correction.',
    ])->assertRedirect(route('admin.hr-review'));

    $submission->refresh();

    expect($submission->stage)->toBe('escalated')
        ->and($submission->is_escalated)->toBeTrue();
});

test('explicit no appeal routes the submission to pmt', function () {
    ['employeeUser' => $employeeUser, 'employee' => $employee] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);

    mockIwrService(['routeAppeal' => [
        'status' => 'routed',
        'stage' => 'sent_to_pmt',
        'routing_action' => 'route_to_pmt',
        'notification' => 'No appeal submitted. Routed to PMT review.',
    ]]);

    $this->actingAs($employeeUser)->post(route('ipcr.no-appeal', $submission))
        ->assertRedirect(route('submit-evaluation'));

    $submission->refresh();

    expect($submission->stage)->toBe('sent_to_pmt')
        ->and($submission->appeal_status)->toBe('no_appeal');
});

test('appeal timeout routes the submission to pmt', function () {
    ['employee' => $employee] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);
    $submission->update(['appeal_window_closes_at' => now()->subHour()]);

    $this->artisan('ipcr:expire-appeals')
        ->assertSuccessful();

    $submission->refresh();

    expect($submission->stage)->toBe('sent_to_pmt')
        ->and($submission->appeal_status)->toBe('no_appeal');
});

test('appeal submission requires evidence', function () {
    ['employeeUser' => $employeeUser, 'employee' => $employee] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);

    $this->actingAs($employeeUser)->post(route('ipcr.appeal.submit', $submission), [
        'appeal_reason' => 'Need to correct the actual accomplishments.',
        'appeal_evidence_description' => 'Supporting reports',
        'evidence_files' => [],
    ])->assertSessionHasErrors(['evidence_files']);
});

test('pmt reject first cycle returns the submission to evaluator', function () {
    ['employee' => $employee, 'pmtUser' => $pmtUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToPmtSubmission($employee);

    mockIwrService(['routePmtReview' => [
        'status' => 'routed',
        'stage' => 'sent_to_evaluator',
        'routing_action' => 're_evaluate',
        'notification' => 'PMT rejected IPCR. Sent back for re-evaluation.',
    ]]);

    $this->actingAs($pmtUser)->post(route('ipcr.pmt-review', $submission), [
        'pmt_decision' => 'rejected',
        'pmt_remarks' => 'Please revise the documentation package.',
    ])->assertRedirect(route('admin.pmt-review'));

    $submission->refresh();

    expect($submission->stage)->toBe('sent_to_evaluator')
        ->and($submission->pmt_cycle_count)->toBe(1)
        ->and($submission->is_escalated)->toBeFalse();
});

test('pmt reject second cycle escalates the submission', function () {
    ['employee' => $employee, 'pmtUser' => $pmtUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToPmtSubmission($employee);
    $submission->update(['pmt_cycle_count' => 1]);

    mockIwrService(['routePmtReview' => [
        'status' => 'escalated',
        'stage' => 'escalated',
        'routing_action' => 'escalate',
        'escalation_reason' => 'PMT review cycle limit reached',
        'notification' => 'IPCR escalated — PMT review cycle limit reached.',
    ]]);

    $this->actingAs($pmtUser)->post(route('ipcr.pmt-review', $submission), [
        'pmt_decision' => 'rejected',
        'pmt_remarks' => 'Escalate due to repeated PMT non-compliance.',
    ])->assertRedirect(route('admin.pmt-review'));

    $submission->refresh();

    expect($submission->stage)->toBe('escalated')
        ->and($submission->is_escalated)->toBeTrue();
});

test('pmt approve routes the submission to hr finalization', function () {
    ['employee' => $employee, 'pmtUser' => $pmtUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToPmtSubmission($employee, 'appealed');

    mockIwrService(['routePmtReview' => [
        'status' => 'routed',
        'stage' => 'sent_to_hr_finalize',
        'routing_action' => 'route_to_hr_finalize',
        'notification' => 'PMT approved IPCR. Ready for finalization.',
    ]]);

    $this->actingAs($pmtUser)->post(route('ipcr.pmt-review', $submission), [
        'pmt_decision' => 'approved',
        'pmt_remarks' => null,
    ])->assertRedirect(route('admin.pmt-review'));

    $submission->refresh();

    expect($submission->stage)->toBe('sent_to_hr_finalize')
        ->and($submission->status)->toBe('routed');
});

test('hr finalization completes the submission and notifies the employee', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    $submission = IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.0,
        'form_payload' => evaluatorFormPayload($employee, 4.0),
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'sent_to_hr_finalize',
        'routing_action' => 'route_to_hr_finalize',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Routed to HR finalization.',
    ]);

    mockIwrService(['finalizeIpcr' => [
        'status' => 'completed',
        'stage' => 'finalized',
        'routing_action' => 'finalized',
        'final_rating' => 4.25,
        'adjectival_rating' => 'Very Outstanding',
        'notification' => 'IPCR finalized. Rating: 4.25 (Very Outstanding).',
    ]]);

    $this->actingAs($hrUser)->post(route('ipcr.finalize', $submission), [
        'final_rating' => 4.25,
    ])->assertRedirect(route('admin.hr-finalize'));

    $submission->refresh();

    expect($submission->stage)->toBe('finalized')
        ->and($submission->status)->toBe('completed')
        ->and((float) $submission->final_rating)->toBe(4.25);

    expect(Notification::query()
        ->where('user_id', $employeeUser->id)
        ->where('type', 'ipcr_finalized')
        ->exists())->toBeTrue();
});

test('pre-finalization payload keeps final rating synced with the current computed rating', function () {
    ['employee' => $employee] = seedIpcrUsersAndEmployees();

    $service = app(IpcrFormTemplateService::class);
    $payload = evaluatorFormPayload($employee, 4.0);

    $payload['finalization']['final_rating'] = 2.0;
    $payload['finalization']['adjectival_rating'] = 'Satisfactory';
    $payload['finalization']['finalized_at'] = null;

    $hydrated = $service->hydrate($payload, $employee);

    expect($hydrated['summary']['computed_rating'])->toBe(4.0)
        ->and($hydrated['finalization']['final_rating'])->toBe(4.0)
        ->and($hydrated['finalization']['adjectival_rating'])->toBe('Very Outstanding');
});

test('submit evaluation page returns workflow and form props', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();
    createAppealWindowSubmission($employee);

    $this->actingAs($employeeUser)
        ->get(route('submit-evaluation'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'employee')
            ->where('periodOpen', false)
            ->has('currentPeriod')
            ->has('employeePanel.history', 1)
            ->has('latestSubmission')
            ->where('latestSubmission.stage', 'appeal_window_open')
        );
});

test('document management includes employees with evaluator-ready submissions', function () {
    ['employee' => $employee, 'evaluatorUser' => $evaluatorUser] = seedIpcrUsersAndEmployees();

    IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'form_payload' => employeeFormPayload($employee),
        'status' => 'routed',
        'stage' => 'sent_to_evaluator',
        'routing_action' => 'route_to_evaluator',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Ready for evaluator review.',
    ]);

    SystemSetting::set('ipcr_period_open', 'true', $evaluatorUser->id);

    $this->actingAs($evaluatorUser)
        ->get(route('document-management'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'evaluator')
            ->where('evaluatorPanel.periodOpen', true)
            ->where('evaluatorPanel.employees.0.employeeId', $employee->employee_id)
            ->where('evaluatorPanel.employees.0.submissionStage', 'sent_to_evaluator')
        );
});

test('ipcr form page returns selected submission snapshot when requested', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);

    $this->actingAs($employeeUser)
        ->get(route('ipcr.form', ['submission_id' => $submission->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-form')
            ->where('selectedSubmission.id', $submission->id)
            ->where('selectedSubmission.stage', 'appeal_window_open')
        );
});

test('ipcr form page includes the pmt chair name in the draft sign off block', function () {
    ['employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    $this->actingAs($employeeUser)
        ->get(route('ipcr.form'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-form')
            ->where('draftFormPayload.sign_off.pmt_chair_name', 'Paolo Matias')
        );
});

test('printable ipcr page returns the selected submission for the employee', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);

    $this->actingAs($employeeUser)
        ->get(route('ipcr.print', ['submission_id' => $submission->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-print')
            ->where('submission.id', $submission->id)
            ->where('workspaceUrl', route('ipcr.form', ['submission_id' => $submission->id]))
            ->where('printableFormPayload.metadata.employee_name', $employee->name)
        );
});

test('submission resource falls back to workflow note remarks when hr remarks column is empty', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    $payload = evaluatorFormPayload($employee, 4.0);
    $payload['workflow_notes']['hr_remarks'] = 'Reviewed by HR and verified against submitted documents.';

    IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.0,
        'form_payload' => $payload,
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'appeal_window_open',
        'routing_action' => 'open_appeal_window',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Appeal window opened.',
        'hr_remarks' => null,
        'appeal_status' => 'appeal_window_open',
        'appeal_window_opens_at' => now(),
        'appeal_window_closes_at' => now()->addHours(12),
    ]);

    $this->actingAs($employeeUser)
        ->get(route('submit-evaluation'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('latestSubmission.hr_remarks', 'Reviewed by HR and verified against submitted documents.')
        );
});

test('hr can open the evaluation period and trigger notifications', function () {
    ['hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_open', 'false', $hrUser->id);

    $this->actingAs($hrUser)
        ->post(route('admin.ipcr.period.update'), [
            'label' => 'January to June 2026',
            'year' => 2026,
            'is_open' => true,
        ])
        ->assertRedirect();

    expect(SystemSetting::get('ipcr_period_open'))->toBeTrue();
    expect(Notification::query()->where('type', 'ipcr_period_opened')->count())->toBeGreaterThan(0);
});

test('hr can close the evaluation period and the page reflects the saved closed state', function () {
    ['hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_open', 'true', $hrUser->id);
    SystemSetting::set('ipcr_period_label', 'January to June 2026', $hrUser->id);
    SystemSetting::set('ipcr_period_year', '2026', $hrUser->id);

    $this->actingAs($hrUser)
        ->post(route('admin.ipcr.period.update'), [
            'label' => 'January to June 2026',
            'year' => 2026,
            'is_open' => false,
        ])
        ->assertRedirect();

    expect(SystemSetting::get('ipcr_period_open'))->toBeFalse();

    $this->actingAs($hrUser)
        ->get(route('admin.hr-review'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('currentPeriod.isOpen', false)
        );
});

test('hr review page includes reviewed and finalized ipcr records', function () {
    ['employee' => $employee, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    $reviewedSubmission = createSentToHrSubmission($employee);
    $reviewedSubmission->update([
        'hr_reviewer_id' => 'HR-001',
        'hr_decision' => 'approved',
        'hr_remarks' => 'Already reviewed by HR.',
        'stage' => 'appeal_window_open',
        'appeal_status' => 'appeal_window_open',
    ]);

    $finalizedSubmission = createSentToHrSubmission($employee);
    $finalizedSubmission->update([
        'hr_reviewer_id' => 'HR-001',
        'stage' => 'finalized',
        'status' => 'completed',
        'final_rating' => 4.25,
        'adjectival_rating' => 'Very Outstanding',
        'finalized_at' => now(),
    ]);

    $this->actingAs($hrUser)
        ->get(route('admin.hr-review'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'hr')
            ->has('hrPanel.reviewQueue', 2)
            ->has('hrPanel.finalizationQueue', 1)
            ->where('hrPanel.finalizationQueue.0.id', $finalizedSubmission->id)
        );
});

test('notifications include target urls for clickable workflow follow ups', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);

    Notification::query()->create([
        'user_id' => $employeeUser->id,
        'type' => 'ipcr_appeal_window',
        'title' => 'IPCR Appeal Window Opened',
        'message' => 'Open your appeal page.',
        'document_type' => 'ipcr',
        'document_id' => $submission->id,
        'is_important' => true,
    ]);

    $this->actingAs($employeeUser)
        ->get(route('notifications'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('notifications')
            ->where('notifications.0.targetUrl', route('ipcr.appeal', $submission))
        );
});
