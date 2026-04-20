<?php

use App\Models\Employee;
use App\Models\IpcrAppeal;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use App\Models\IwrAuditLog;
use App\Models\Notification;
use App\Models\Seminars;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\AtreService;
use App\Services\IpcrFormTemplateService;
use App\Services\IwrService;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery\MockInterface;

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
        'evaluator_pass_fail' => 'passed',
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

test('hr correct returns the submission to the employee for appeal review', function () {
    ['employee' => $employee, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToHrSubmission($employee);

    mockIwrService(['routeHrReview' => [
        'status' => 'routed',
        'stage' => 'appeal_window_open',
        'routing_action' => 'open_appeal_window',
        'appeal_window_hours' => 72,
        'notification' => 'HR verified the evaluation and returned it to the employee.',
    ]]);

    $this->actingAs($hrUser)->post(route('ipcr.hr-review', $submission), [
        'hr_decision' => 'correct',
        'hr_remarks' => null,
    ])->assertRedirect(route('admin.hr-review'));

    $submission->refresh();

    expect($submission->stage)->toBe('appeal_window_open')
        ->and($submission->hr_cycle_count)->toBe(1)
        ->and($submission->appeal_status)->toBe('appeal_window_open')
        ->and($submission->appeal_window_closes_at)->not->toBeNull();
});

test('appeal window is still exposed when the stage is open but appeal status is missing', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    $submission = createSentToHrSubmission($employee);
    $submission->update([
        'stage' => 'appeal_window_open',
        'appeal_status' => null,
        'appeal_window_opens_at' => now(),
        'appeal_window_closes_at' => now()->addHours(72),
    ]);

    $this->actingAs($employeeUser)
        ->get(route('submit-evaluation'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('latestSubmission.stage', 'appeal_window_open')
            ->where('latestSubmission.appeal_window_closes_at', $submission->appeal_window_closes_at->toIso8601String())
            ->where('latestSubmission.appeal_url', route('ipcr.appeal', $submission))
        );
});

test('legacy hr review errors are repaired into an appeal window when the employee opens submit evaluation', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    $submission = createSentToHrSubmission($employee);
    $submission->update([
        'status' => 'error',
        'stage' => 'hr_review',
        'routing_action' => 'validation_failed',
        'hr_decision' => 'correct',
        'hr_remarks' => null,
        'appeal_status' => null,
        'appeal_window_opens_at' => null,
        'appeal_window_closes_at' => null,
    ]);

    mockIwrService(['routeHrReview' => [
        'status' => 'routed',
        'stage' => 'appeal_window_open',
        'routing_action' => 'open_appeal_window',
        'appeal_window_hours' => 72,
        'notification' => 'HR verified the evaluation and returned it to the employee.',
    ]]);

    $this->actingAs($employeeUser)
        ->get(route('submit-evaluation'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('latestSubmission.status', 'routed')
            ->where('latestSubmission.stage', 'appeal_window_open')
            ->where('latestSubmission.appeal_status', 'appeal_window_open')
            ->where('latestSubmission.appeal_url', route('ipcr.appeal', $submission))
        );
});

test('hr incorrect returns the submission to the evaluator for correction', function () {
    ['employee' => $employee, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToHrSubmission($employee);

    mockIwrService(['routeHrReview' => [
        'status' => 'routed',
        'stage' => 'sent_to_evaluator',
        'routing_action' => 're_evaluate',
        'notification' => 'HR returned IPCR to the evaluator for correction.',
    ]]);

    $this->actingAs($hrUser)->post(route('ipcr.hr-review', $submission), [
        'hr_decision' => 'incorrect',
        'hr_remarks' => 'Please correct the supporting computation.',
    ])->assertRedirect(route('admin.hr-review'));

    $submission->refresh();

    expect($submission->stage)->toBe('sent_to_evaluator')
        ->and($submission->hr_cycle_count)->toBe(1)
        ->and($submission->is_escalated)->toBeFalse()
        ->and($submission->appeal_status)->toBeNull();
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
        'hr_decision' => 'incorrect',
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

test('appeal submission routes successfully when the appeal window is open', function () {
    ['employeeUser' => $employeeUser, 'employee' => $employee] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);

    mockIwrService(['routeAppeal' => [
        'status' => 'routed',
        'stage' => 'sent_to_evaluator',
        'routing_action' => 're_evaluate',
        'notification' => 'First appeal submitted by Patricia Garcia. Routed back to evaluator for re-evaluation.',
    ]]);

    $response = $this->actingAs($employeeUser)->post(route('ipcr.appeal.submit', $submission), [
        'appeal_reason' => 'Need to correct the actual accomplishments.',
        'appeal_evidence_description' => 'Supporting reports',
        'evidence_files' => [
            UploadedFile::fake()->create('supporting-report.pdf', 120, 'application/pdf'),
        ],
    ]);

    $response->assertRedirect(route('submit-evaluation'));

    $submission->refresh();

    expect($submission->appeal_count)->toBe(1)
        ->and($submission->appeal_status)->toBe('appealed')
        ->and($submission->stage)->toBe('sent_to_evaluator')
        ->and($submission->status)->toBe('routed');
});

test('appeal submission falls back to local routing when the workflow service errors', function () {
    ['employeeUser' => $employeeUser, 'employee' => $employee] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);

    mockIwrService(['routeAppeal' => [
        'status' => 'error',
        'notification' => 'IWR service is unavailable. Please try again later.',
    ]]);

    $response = $this->actingAs($employeeUser)->post(route('ipcr.appeal.submit', $submission), [
        'appeal_reason' => 'Need to correct the actual accomplishments.',
        'appeal_evidence_description' => 'Supporting reports',
        'evidence_files' => [
            UploadedFile::fake()->create('supporting-report.pdf', 120, 'application/pdf'),
        ],
    ]);

    $response->assertRedirect(route('submit-evaluation'));

    $submission->refresh();

    expect($submission->appeal_count)->toBe(1)
        ->and($submission->appeal_status)->toBe('appealed')
        ->and($submission->stage)->toBe('sent_to_evaluator')
        ->and($submission->status)->toBe('routed');
});

test('second appeal routes to pmt and surfaces as appealed in the review queue', function () {
    ['employeeUser' => $employeeUser, 'employee' => $employee, 'pmtUser' => $pmtUser] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);
    $submission->update(['appeal_count' => 1]);

    mockIwrService(['routeAppeal' => [
        'status' => 'routed',
        'stage' => 'sent_to_pmt',
        'routing_action' => 'route_to_pmt',
        'notification' => 'Second appeal submitted by Patricia Garcia. Routed to PMT for policy-level validation.',
    ]]);

    $response = $this->actingAs($employeeUser)->post(route('ipcr.appeal.submit', $submission), [
        'appeal_reason' => 'The second review still has a rating issue.',
        'appeal_evidence_description' => 'Supporting records for the second appeal.',
        'evidence_files' => [
            UploadedFile::fake()->create('second-appeal.pdf', 120, 'application/pdf'),
        ],
    ]);

    $response->assertRedirect(route('submit-evaluation'));

    $submission->refresh();

    expect($submission->appeal_count)->toBe(2)
        ->and($submission->appeal_status)->toBe('appealed')
        ->and($submission->stage)->toBe('sent_to_pmt')
        ->and($submission->routing_action)->toBe('route_to_pmt');

    expect(Notification::query()
        ->where('user_id', $pmtUser->id)
        ->where('type', 'ipcr_pending_pmt_review')
        ->where('message', 'like', '%submitted an appeal%')
        ->exists())->toBeTrue();

    $this->actingAs($pmtUser)
        ->get(route('admin.pmt-review'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'pmt')
            ->where('pmtPanel.submissions.0.appeal_status', 'appealed')
        );
});

test('appeal evidence files can be viewed inline', function () {
    Storage::fake('local');

    ['employee' => $employee, 'pmtUser' => $pmtUser] = seedIpcrUsersAndEmployees();
    $submission = createSentToPmtSubmission($employee, 'appealed');

    $appeal = IpcrAppeal::query()->create([
        'ipcr_submission_id' => $submission->id,
        'employee_id' => $employee->employee_id,
        'appeal_reason' => 'Need to inspect the evidence.',
        'appeal_evidence_description' => 'Supporting records',
        'evidence_files' => ['ipcr-appeals/support.pdf'],
        'status' => 'submitted',
    ]);

    Storage::disk('local')->put('ipcr-appeals/support.pdf', 'appeal evidence');

    $this->actingAs($pmtUser)
        ->get("/ipcr/appeal/{$appeal->id}/evidence/0?inline=1")
        ->assertOk()
        ->assertHeader('Content-Disposition', 'inline; filename="support.pdf"');
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

test('submit evaluation page keeps the ipcr form preview launcher enabled while the period is closed', function () {
    ['employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_open', 'false', $employeeUser->id);
    SystemSetting::set('ipcr_period_label', 'January to June 2026', $employeeUser->id);
    SystemSetting::set('ipcr_period_year', '2026', $employeeUser->id);

    $this->actingAs($employeeUser)
        ->get(route('submit-evaluation'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('periodOpen', false)
            ->where('employeePanel.canOpenForm', true)
            ->where(
                'employeePanel.periodMessage',
                'HR has not enabled the evaluation period yet. You can still preview the IPCR form below, but editing and submission stay disabled until the period opens.',
            )
        );
});

test('ipcr form page remains previewable while the evaluation period is closed', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_open', 'false', $employeeUser->id);
    SystemSetting::set('ipcr_period_label', 'January to June 2026', $employeeUser->id);
    SystemSetting::set('ipcr_period_year', '2026', $employeeUser->id);

    $service = app(IpcrFormTemplateService::class);
    $draft = $service->draft($employee, 'January to June 2026');

    $this->actingAs($employeeUser)
        ->get(route('ipcr.form'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-form')
            ->where('periodOpen', false)
            ->has('draftFormPayload.sections', count($draft['sections']))
            ->has('latestSubmission')
        );
});

test('document management includes employees with evaluator-ready submissions', function () {
    ['employee' => $employee, 'evaluatorUser' => $evaluatorUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_label', 'January to June 2026', $evaluatorUser->id);
    SystemSetting::set('ipcr_period_year', 2026, $evaluatorUser->id);

    $targetPayload = app(IpcrFormTemplateService::class)->draft($employee, 'First Semester 2026');
    $targetPayload['sections'][0]['rows'][0]['accountable'] = 'Complete the evaluator-ready target plan for the first semester.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => $targetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

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
            ->where('evaluatorPanel.employees.0.currentTargetStatus', 'submitted')
        );
});

test('reviewer target page exposes the employee target reference for evaluators', function () {
    ['employee' => $employee, 'evaluatorUser' => $evaluatorUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_label', 'January to June 2026', $evaluatorUser->id);
    SystemSetting::set('ipcr_period_year', 2026, $evaluatorUser->id);

    $targetPayload = app(IpcrFormTemplateService::class)->draft($employee, 'First Semester 2026');
    $targetPayload['sections'][0]['rows'][0]['accountable'] = 'Prepare the office-wide routing tracker before the July submission cycle.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => $targetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    $this->actingAs($evaluatorUser)
        ->get(route('ipcr.target.review', ['employee_id' => $employee->employee_id, 'source' => 'evaluator']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-target-review')
            ->where('viewerRole', 'evaluator')
            ->where('currentTarget.status', 'submitted')
            ->where('currentTarget.target_year', 2026)
            ->where('currentTarget.form_payload.sections.0.rows.0.accountable', 'Prepare the office-wide routing tracker before the July submission cycle.')
        );
});

test('reviewer target page resolves the submission period for hr and pmt users', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser, 'hrUser' => $hrUser, 'pmtUser' => $pmtUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_label', 'January to June 2027', $employeeUser->id);
    SystemSetting::set('ipcr_period_year', 2027, $employeeUser->id);

    $targetPayload = app(IpcrFormTemplateService::class)->draft($employee, 'Second Semester 2026');
    $targetPayload['sections'][1]['rows'][0]['accountable'] = 'Archive and validate the July to December routing outputs before year end.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 2,
        'target_year' => 2026,
        'form_payload' => $targetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    $submission = IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'form_payload' => employeeFormPayload($employee),
        'status' => 'routed',
        'stage' => 'sent_to_hr',
        'routing_action' => 'route_to_hr',
        'notification' => 'Ready for HR review.',
    ]);

    $submissionPayload = $submission->form_payload;
    $submissionPayload['metadata']['period'] = 'July to December 2026';
    $submission->update(['form_payload' => $submissionPayload]);

    $this->actingAs($hrUser)
        ->get(route('ipcr.target.review', ['submission_id' => $submission->id, 'source' => 'hr-review']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-target-review')
            ->where('viewerRole', 'hr')
            ->where('targetPeriodLabel', 'July to December 2026')
            ->where('currentTarget.semester', 2)
        );

    $submission->update(['stage' => 'sent_to_pmt']);

    $this->actingAs($pmtUser)
        ->get(route('ipcr.target.review', ['submission_id' => $submission->id, 'source' => 'pmt']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-target-review')
            ->where('viewerRole', 'pmt')
            ->where('targetPeriodLabel', 'July to December 2026')
            ->where('currentTarget.target_year', 2026)
            ->where('currentTarget.form_payload.sections.1.rows.0.accountable', 'Archive and validate the July to December routing outputs before year end.')
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

test('ipcr form page includes the current period target reference for the employee', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_label', 'January to June 2026', $employeeUser->id);
    SystemSetting::set('ipcr_period_year', 2026, $employeeUser->id);

    $targetPayload = app(IpcrFormTemplateService::class)->draft($employee, 'First Semester 2026');
    $targetPayload['sections'][0]['rows'][0]['accountable'] = 'Complete the semester personnel file audit and submit a validated tracker.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => $targetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    $this->actingAs($employeeUser)
        ->get(route('ipcr.form'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-form')
            ->where('currentTarget.status', 'submitted')
            ->where('currentTarget.target_year', 2026)
            ->where('currentTarget.form_payload.sections.0.rows.0.accountable', 'Complete the semester personnel file audit and submit a validated tracker.')
        );
});

test('ipcr form page resolves the second semester target from a july to december period label', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_label', 'July to December 2026', $employeeUser->id);
    SystemSetting::set('ipcr_period_year', 2026, $employeeUser->id);

    $targetPayload = app(IpcrFormTemplateService::class)->draft($employee, 'Second Semester 2026');
    $targetPayload['sections'][1]['rows'][0]['accountable'] = 'Submit the complete records routing log for July to December 2026.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 2,
        'target_year' => 2026,
        'form_payload' => $targetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    $this->actingAs($employeeUser)
        ->get(route('ipcr.form'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-form')
            ->where('currentTarget.semester', 2)
            ->where('currentTarget.target_year', 2026)
            ->where('currentTarget.form_payload.sections.1.rows.0.accountable', 'Submit the complete records routing log for July to December 2026.')
        );
});

test('ipcr target page opens the november window for the next first semester cycle', function () {
    ['employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2025-11-15 09:00:00');

    try {
        $this->actingAs($employeeUser)
            ->get(route('ipcr.target'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target')
                ->where('targetPeriod.semester', 1)
                ->where('targetPeriod.year', 2026)
                ->where('targetPeriod.submissionOpen', true)
                ->where('targetPeriod.submissionWindowLabel', 'November 2025')
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('ipcr target page opens the may window for the current second semester cycle', function () {
    ['employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-05-10 09:00:00');

    try {
        $this->actingAs($employeeUser)
            ->get(route('ipcr.target'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target')
                ->where('targetPeriod.semester', 2)
                ->where('targetPeriod.year', 2026)
                ->where('targetPeriod.submissionOpen', true)
                ->where('targetPeriod.submissionWindowLabel', 'May 2026')
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('ipcr target page returns past target history and the selected snapshot', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-05-10 09:00:00');

    try {
        $service = app(IpcrFormTemplateService::class);

        $previousTargetPayload = $service->draft($employee, 'First Semester 2026');
        $previousTargetPayload['sections'][0]['rows'][0]['accountable'] = 'Complete the first semester records consolidation plan.';

        $previousTarget = IpcrTarget::query()->create([
            'employee_id' => $employee->employee_id,
            'semester' => 1,
            'target_year' => 2026,
            'form_payload' => $previousTargetPayload,
            'status' => 'submitted',
            'submitted_at' => now()->subMonths(5),
        ]);

        $currentTargetPayload = $service->draft($employee, 'Second Semester 2026');
        $currentTargetPayload['sections'][0]['rows'][0]['accountable'] = 'Prepare the second semester records routing tracker.';

        IpcrTarget::query()->create([
            'employee_id' => $employee->employee_id,
            'semester' => 2,
            'target_year' => 2026,
            'form_payload' => $currentTargetPayload,
            'status' => 'draft',
        ]);

        $this->actingAs($employeeUser)
            ->get(route('ipcr.target'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target')
                ->where('existingTarget.semester', 2)
                ->has('targetHistory', 1)
                ->where('targetHistory.0.id', $previousTarget->id)
                ->where('selectedTarget', null)
            );

        $this->actingAs($employeeUser)
            ->get(route('ipcr.target', ['target_id' => $previousTarget->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target')
                ->where('selectedTarget.id', $previousTarget->id)
                ->where('selectedTarget.semester', 1)
                ->where('selectedTarget.form_payload.sections.0.rows.0.accountable', 'Complete the first semester records consolidation plan.')
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('printable ipcr page returns the selected submission for the employee', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();
    $submission = createAppealWindowSubmission($employee);

    $targetPayload = app(IpcrFormTemplateService::class)->targetDraft($employee, 'January to June 2026');
    $targetPayload['sections'][0]['rows'][0]['accountable'] = 'Maria Santos will coordinate employee records, plantilla movement, and office staffing requirements.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => $targetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    $response = $this->actingAs($employeeUser)
        ->get(route('ipcr.print', ['submission_id' => $submission->id]));

    $response->assertOk();
    expect($response->baseResponse->headers->get('content-type'))->toContain('application/pdf');
    expect($response->baseResponse->headers->get('content-disposition'))->toContain('inline');
});

test('printable ipcr blade uses compact criterion blocks', function () {
    ['employee' => $employee] = seedIpcrUsersAndEmployees();

    $payload = employeeFormPayload($employee);
    $targetPayload = app(IpcrFormTemplateService::class)->targetDraft($employee, 'January to June 2026');
    $payload['workflow_notes']['employee_notes'] = 'Employee notes for the printable copy.';
    $payload['sections'][0]['rows'][0]['actual_accomplishment'] = "  Completed and documented.\n    Followed through with the office.";
    $payload['sections'][0]['rows'][0]['remarks'] = "  Excellent execution.\n    No missing references.";
    $payload['sections'][0]['rows'][0]['accountable'] = 'This is the submission template placeholder and should not win.';
    $targetPayload['sections'][0]['rows'][0]['accountable'] = "  Maria Santos will coordinate employee records, plantilla movement, and office staffing requirements.\n    Followed through with the office.";

    $html = view('pdf.ipcr-print', [
        'submission' => null,
        'printableFormPayload' => $payload,
        'printableTargetFormPayload' => $targetPayload,
    ])->render();

    expect($html)
        ->toContain('Success Indicators')
        ->toContain('Maria Santos will coordinate employee records, plantilla movement, and office staffing requirements.')
        ->toContain('Actual Accomplishments')
        ->toContain('Provincial Government of Tarlac')
        ->toContain('Individual Performance Commitment and Review')
        ->not->toContain('Measures:')
        ->not->toContain('  Completed and documented.')
        ->not->toContain('  Excellent execution.')
        ->not->toContain('Self Assessment');
});

test('submit evaluation page surfaces training recommendations for notified employees', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    $submission = IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.25,
        'form_payload' => evaluatorFormPayload($employee, 4.25),
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'finalized',
        'routing_action' => 'finalized',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Finalized.',
    ]);

    Seminars::query()->create([
        'title' => 'Customer Service Excellence',
        'description' => 'Service skills workshop.',
        'target_performance_area' => 'Customer service delivery',
        'rating_tier' => '3-4',
        'date' => '2026-04-01',
    ]);

    Notification::query()->create([
        'user_id' => $employeeUser->id,
        'type' => 'training_suggestion',
        'title' => 'Training Recommendation',
        'message' => 'HR opened training discovery for your latest Performance Evaluation. Review the recommended seminars tied to your Administrative Office service areas.',
        'document_type' => 'ipcr',
        'document_id' => $submission->id,
        'is_important' => true,
    ]);

    $this->mock(AtreService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('recommend')
            ->once()
            ->with(
                \Mockery::on(function (array $seminars): bool {
                    return count($seminars) >= 1
                        && array_key_exists('rating_tier', $seminars[0])
                        && array_key_exists('title', $seminars[0]);
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

    $this->actingAs($employeeUser)
        ->get(route('submit-evaluation'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('employeePanel.recommendations.0.title', 'Customer Service Excellence')
            ->where('employeePanel.riskLevel', 'MEDIUM')
            ->where('employeePanel.recommendationsEnabled', true));
});

test('submit evaluation page hides training recommendations when the notification belongs to an older submission', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    $olderSubmission = IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.1,
        'form_payload' => evaluatorFormPayload($employee, 4.1),
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'finalized',
        'routing_action' => 'finalized',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Previous cycle finalized.',
    ]);

    IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.25,
        'form_payload' => evaluatorFormPayload($employee, 4.25),
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'finalized',
        'routing_action' => 'finalized',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Current cycle finalized.',
    ]);

    Notification::query()->create([
        'user_id' => $employeeUser->id,
        'type' => 'training_suggestion',
        'title' => 'Training Recommendation',
        'message' => 'HR opened training discovery for a previous Performance Evaluation.',
        'document_type' => 'ipcr',
        'document_id' => $olderSubmission->id,
        'is_important' => true,
    ]);

    $this->mock(AtreService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('recommend')->never();
    });

    $this->actingAs($employeeUser)
        ->get(route('submit-evaluation'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('employeePanel.recommendations', [])
            ->where('employeePanel.recommendationsEnabled', false));
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
        ->assertRedirect()
        ->assertSessionHas('success', 'The IPCR submission and evaluation period is now open and employees have been notified.');

    expect(SystemSetting::get('ipcr_period_open'))->toBeTrue();
    expect(Notification::query()->where('type', 'ipcr_period_opened')->count())->toBeGreaterThan(0);
});

test('hr can notify employees to set ipcr targets during the active target window', function () {
    ['employeeUser' => $employeeUser, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-05-10 09:00:00');

    try {
        $this->actingAs($hrUser)
            ->post(route('admin.ipcr.target.notify'))
            ->assertRedirect();

        expect(Notification::query()
            ->where('user_id', $employeeUser->id)
            ->where('type', 'ipcr_target_window_opened')
            ->count())->toBe(1);
    } finally {
        Carbon::setTestNow();
    }
});

test('hr can notify employees about training suggestions from the finalization view', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    $secondaryEmployee = Employee::query()->create([
        'employee_id' => 'EMP-006',
        'name' => 'Marlon Santos',
        'job_title' => 'Administrative Aide II',
        'supervisor_id' => null,
    ]);

    $secondaryEmployeeUser = User::factory()->create([
        'name' => $secondaryEmployee->name,
        'email' => 'employee2@example.com',
        'employee_id' => $secondaryEmployee->employee_id,
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $submission = IpcrSubmission::query()->create([
        'employee_id' => $employee->employee_id,
        'performance_rating' => 4.14,
        'form_payload' => evaluatorFormPayload($employee, 4.14),
        'is_first_submission' => false,
        'evaluator_gave_remarks' => true,
        'status' => 'routed',
        'stage' => 'sent_to_hr_finalize',
        'routing_action' => 'route_to_hr_finalize',
        'evaluator_id' => 'EMP-001',
        'notification' => 'Routed to HR finalization.',
    ]);

    $this->actingAs($hrUser)
        ->post('/admin/training-suggestions/notify', [
            'submission_id' => $submission->id,
        ])
        ->assertRedirect();

    expect(Notification::query()
        ->where('user_id', $employeeUser->id)
        ->where('type', 'training_suggestion')
        ->count())->toBe(1);

    expect(Notification::query()
        ->where('user_id', $secondaryEmployeeUser->id)
        ->where('type', 'training_suggestion')
        ->count())->toBe(0);
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
        ->assertRedirect()
        ->assertSessionHas('success', 'The IPCR evaluation period is now closed.');

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

test('hr target management page renders submitted and finalized targets', function () {
    ['employee' => $employee, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    $service = app(IpcrFormTemplateService::class);

    $submittedTargetPayload = $service->targetDraft($employee, 'First Semester 2026');
    $submittedTargetPayload['sections'][0]['rows'][0]['accountable'] = 'Prepare the first semester target plan.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => $submittedTargetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    $finalizedTargetPayload = $service->targetDraft($employee, 'Second Semester 2026');
    $finalizedTargetPayload['sections'][0]['rows'][0]['accountable'] = 'Finalize and archive the second semester targets.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 2,
        'target_year' => 2026,
        'form_payload' => $finalizedTargetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
        'hr_finalized' => true,
    ]);

    $this->actingAs($hrUser)
        ->get(route('admin.ipcr.target-management'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/ipcr-target-management')
            ->where('submittedTargets.0.status', 'submitted')
            ->where('finalizedTargets.0.hr_finalized', true)
        );
});

test('hr target management page exposes the closed target window state', function () {
    ['hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-04-08 09:00:00');

    try {
        $this->actingAs($hrUser)
            ->get(route('admin.ipcr.target-management'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/ipcr-target-management')
                ->where('currentTargetPeriod.semester', 1)
                ->where('currentTargetPeriod.year', 2026)
                ->where('currentTargetPeriod.submissionOpen', false)
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('hr target management page exposes the open target window state', function () {
    ['hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-05-10 09:00:00');

    try {
        $this->actingAs($hrUser)
            ->get(route('admin.ipcr.target-management'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/ipcr-target-management')
                ->where('currentTargetPeriod.submissionOpen', true)
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('ipcr target form page keeps the first semester cycle visible while closed in april', function () {
    ['employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-04-08 09:00:00');

    try {
        $this->actingAs($employeeUser)
            ->get(route('ipcr.target.form'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target-form')
                ->where('targetPeriod.semester', 1)
                ->where('targetPeriod.year', 2026)
                ->where('targetPeriod.submissionOpen', false)
                ->where('targetPeriod.submissionWindowLabel', 'November 2025')
            );
    } finally {
        Carbon::setTestNow();
    }
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

test('target window notifications route employees to the ipcr target page', function () {
    ['employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    Notification::query()->create([
        'user_id' => $employeeUser->id,
        'type' => 'ipcr_target_window_opened',
        'title' => 'IPCR Target Setting Window Open',
        'message' => 'Complete your IPCR target form.',
        'is_important' => true,
    ]);

    $this->actingAs($employeeUser)
        ->get(route('notifications'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('notifications')
            ->where('notifications.0.targetUrl', route('ipcr.target'))
        );
});

test('ipcr target notifications route employees back to the target workspace', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    $service = app(IpcrFormTemplateService::class);
    $targetPayload = $service->targetDraft($employee, 'First Semester 2026');
    $targetPayload['sections'][0]['rows'][0]['accountable'] = 'Document the planned accomplishment.';

    $target = IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => $targetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    Notification::query()->create([
        'user_id' => $employeeUser->id,
        'type' => 'ipcr_target_approved',
        'title' => 'IPCR Target Approved',
        'message' => 'Your IPCR target has been approved.',
        'document_type' => 'ipcr_target',
        'document_id' => $target->id,
        'is_important' => false,
    ]);

    $this->actingAs($employeeUser)
        ->get(route('notifications'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('notifications')
            ->where('notifications.0.targetUrl', route('ipcr.target', ['target_id' => $target->id]))
        );
});

// ============================================================================
// IPCR Target Workflow — new spec tests
// ============================================================================

test('ipcr target draft form has blank accountable fields so employees fill in their own targets', function () {
    $service = app(\App\Services\IpcrFormTemplateService::class);

    $employee = Employee::query()->create([
        'employee_id' => 'EMP-005',
        'name' => 'Patricia Garcia',
        'job_title' => 'Administrative Aide I',
        'supervisor_id' => null,
    ]);

    $payload = $service->targetDraft($employee, 'First Semester 2026');

    foreach ($payload['sections'] as $section) {
        foreach ($section['rows'] as $row) {
            expect($row['accountable'])->toBe('');
        }
    }
});

test('hr can close the ipcr target submission window even during the may cycle', function () {
    ['employeeUser' => $employeeUser, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-05-10 09:00:00');

    try {
        $this->actingAs($hrUser)
            ->post(route('admin.ipcr.target.notify'), [
                'semester' => 2,
                'year' => 2026,
            ])
            ->assertRedirect();

        $this->actingAs($employeeUser)
            ->get(route('ipcr.target.form'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target-form')
                ->where('targetPeriod.submissionOpen', true)
                ->where('targetPeriod.semester', 2)
                ->where('targetPeriod.year', 2026)
            );

        $this->actingAs($hrUser)
            ->post(route('admin.ipcr.target.close'))
            ->assertRedirect();

        expect(SystemSetting::get('ipcr_target_mode'))->toBe('closed');
        expect(SystemSetting::get('ipcr_target_open'))->toBeFalse();

        // After closing, May should stay closed instead of auto-opening again.
        $this->actingAs($employeeUser)
            ->get(route('ipcr.target.form'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target-form')
                ->where('targetPeriod.submissionOpen', false)
                ->where('targetPeriod.semester', 2)
                ->where('targetPeriod.year', 2026)
                ->where('targetPeriod.submissionWindowLabel', 'May 2026')
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('hr force-open window is honoured even outside november and may', function () {
    ['employeeUser' => $employeeUser, 'hrUser' => $hrUser] = seedIpcrUsersAndEmployees();

    SystemSetting::query()
        ->where('key', 'ipcr_target_mode')
        ->delete();

    Carbon::setTestNow('2026-03-10 09:00:00'); // March — normally closed

    try {
        $this->actingAs($hrUser)
            ->post(route('admin.ipcr.target.notify'), [
                'semester' => 1,
                'year' => 2026,
            ])
            ->assertRedirect();

        $this->actingAs($employeeUser)
            ->get(route('ipcr.target.form'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target-form')
                ->where('targetPeriod.submissionOpen', true)
                ->where('targetPeriod.semester', 1)
                ->where('targetPeriod.year', 2026)
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('an existing ipcr target draft can still be saved after the window closes', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-04-08 09:00:00');

    try {
        $service = app(\App\Services\IpcrFormTemplateService::class);
        $payload = $service->targetDraft($employee, 'First Semester 2026');
        $payload['sections'][0]['rows'][0]['accountable'] = 'Original draft value.';

        IpcrTarget::query()->create([
            'employee_id' => $employee->employee_id,
            'semester' => 1,
            'target_year' => 2026,
            'form_payload' => $payload,
            'status' => 'draft',
            'submitted_at' => null,
        ]);

        $payload['sections'][0]['rows'][0]['accountable'] = 'Updated after the window closed.';

        $this->actingAs($employeeUser)
            ->post(route('ipcr.target.save'), [
                'semester' => 1,
                'target_year' => 2026,
                'form_payload' => $payload,
                'action' => 'save',
            ])
            ->assertRedirect();

        $target = IpcrTarget::query()
            ->where('employee_id', $employee->employee_id)
            ->where('semester', 1)
            ->where('target_year', 2026)
            ->first();

        expect($target)->not->toBeNull();
        expect($target->status)->toBe('draft');
        expect($target->form_payload['sections'][0]['rows'][0]['accountable'])->toBe('Updated after the window closed.');
    } finally {
        Carbon::setTestNow();
    }
});

test('ipcr target submission routes through iwr and assigns evaluator', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_target_open', 'true', $employeeUser->id);
    SystemSetting::setIpcrTargetMode('open', $employeeUser->id);
    SystemSetting::set('ipcr_target_semester', '2', $employeeUser->id);
    SystemSetting::set('ipcr_target_year', '2026', $employeeUser->id);

    $service = app(\App\Services\IpcrFormTemplateService::class);
    $formPayload = $service->targetDraft($employee, 'Second Semester 2026');

    // Fill in target text
    foreach ($formPayload['sections'] as $sectionIndex => $section) {
        foreach ($section['rows'] as $rowIndex => $row) {
            $formPayload['sections'][$sectionIndex]['rows'][$rowIndex]['accountable'] = 'Complete and document all tasks for the semester.';
        }
    }

    $this->actingAs($employeeUser)
        ->post(route('ipcr.target.save'), [
            'semester' => 2,
            'target_year' => 2026,
            'form_payload' => $formPayload,
            'action' => 'submit',
        ])
        ->assertRedirect();

    $target = IpcrTarget::query()
        ->where('employee_id', $employee->employee_id)
        ->where('semester', 2)
        ->where('target_year', 2026)
        ->first();

    expect($target)->not->toBeNull();
    expect($target->status)->toBe('submitted');
    // IWR should have assigned the evaluator (supervisor = EMP-001)
    expect($target->evaluator_id)->toBe('EMP-001');

    $auditLog = IwrAuditLog::query()
        ->where('employee_id', $employee->employee_id)
        ->where('document_type', 'ipcr_target')
        ->where('document_id', $target->id)
        ->first();

    expect($auditLog)->not->toBeNull();
    expect($auditLog->routing_action)->toBe('route_to_evaluator');
});

test('rejected ipcr target can be edited and resubmitted while the target window is closed', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    Carbon::setTestNow('2026-04-08 09:00:00');

    try {
        $service = app(IpcrFormTemplateService::class);
        $formPayload = $service->targetDraft($employee, 'First Semester 2026');
        $formPayload['sections'][0]['rows'][0]['accountable'] = 'Original returned target value.';

        $target = IpcrTarget::query()->create([
            'employee_id' => $employee->employee_id,
            'semester' => 1,
            'target_year' => 2026,
            'form_payload' => $formPayload,
            'status' => 'submitted',
            'submitted_at' => now()->subDay(),
            'evaluator_id' => 'EMP-001',
            'evaluator_decision' => 'rejected',
            'evaluator_remarks' => 'Please revise this target.',
            'evaluator_reviewed_at' => now()->subHours(2),
        ]);

        $this->actingAs($employeeUser)
            ->get(route('ipcr.target.form'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ipcr-target-form')
                ->where('existingTarget.id', $target->id)
                ->where('existingTarget.evaluator_decision', 'rejected')
            );

        $updatedPayload = $formPayload;
        // Fill all rows to satisfy the 12/12 submission requirement.
        foreach ($updatedPayload['sections'] as $sIdx => $section) {
            foreach (array_keys($section['rows']) as $rIdx) {
                if (trim($updatedPayload['sections'][$sIdx]['rows'][$rIdx]['accountable'] ?? '') === '') {
                    $updatedPayload['sections'][$sIdx]['rows'][$rIdx]['accountable'] = 'Completed target for this criterion.';
                }
            }
        }
        $updatedPayload['sections'][0]['rows'][0]['accountable'] = 'Updated after review.';

        mockIwrService(['routeIpcrTarget' => [
            'status' => 'routed',
            'stage' => 'sent_to_evaluator',
            'routing_action' => 'route_to_evaluator',
            'evaluator_id' => 'EMP-001',
            'evaluator_name' => 'John Reyes',
            'confidence_pct' => 100.0,
            'notification' => 'IPCR targets resent to John Reyes for review.',
        ]]);

        $this->actingAs($employeeUser)
            ->post(route('ipcr.target.save'), [
                'semester' => 1,
                'target_year' => 2026,
                'form_payload' => $updatedPayload,
                'action' => 'submit',
            ])
            ->assertRedirect();

        $target->refresh();

        expect($target->status)->toBe('submitted');
        expect($target->evaluator_decision)->toBeNull();
        expect($target->evaluator_remarks)->toBeNull();
        expect($target->evaluator_reviewed_at)->toBeNull();
        expect($target->form_payload['sections'][0]['rows'][0]['accountable'])->toBe('Updated after review.');
    } finally {
        Carbon::setTestNow();
    }
});

test('ipcr form page includes the matching target reference when submission period matches target semester', function () {
    ['employee' => $employee, 'employeeUser' => $employeeUser] = seedIpcrUsersAndEmployees();

    SystemSetting::set('ipcr_period_open', 'true', $employeeUser->id);
    SystemSetting::set('ipcr_period_label', 'January to June 2026', $employeeUser->id);
    SystemSetting::set('ipcr_period_year', '2026', $employeeUser->id);

    $service = app(\App\Services\IpcrFormTemplateService::class);
    $targetPayload = $service->targetDraft($employee, 'First Semester 2026');
    $targetPayload['sections'][0]['rows'][0]['accountable'] = 'My planned target for Q1.';

    IpcrTarget::query()->create([
        'employee_id' => $employee->employee_id,
        'semester' => 1,
        'target_year' => 2026,
        'form_payload' => $targetPayload,
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    $this->actingAs($employeeUser)
        ->get(route('ipcr.form'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-form')
            ->where('currentTarget.semester', 1)
            ->where('currentTarget.target_year', 2026)
            ->where('currentTarget.form_payload.sections.0.rows.0.accountable', 'My planned target for Q1.')
        );
});
