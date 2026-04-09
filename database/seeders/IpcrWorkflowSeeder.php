<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use App\Models\IwrAuditLog;
use App\Models\Notification;
use App\Services\IpcrFormTemplateService;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class IpcrWorkflowSeeder extends Seeder
{
    private const TARGET_PERIOD_LABEL = 'First Semester 2026';

    private const SUBMISSION_PERIOD_LABEL = 'January to June 2026';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->resetWorkflowData();

        $service = app(IpcrFormTemplateService::class);
        $now = now();

        $employees = Employee::query()
            ->orderBy('employee_id')
            ->get()
            ->reject(fn (Employee $employee): bool => $employee->employee_id === 'EMP-001')
            ->values();

        if ($employees->isEmpty()) {
            throw new RuntimeException('The IPCR workflow seeder expects at least one employee record to exist.');
        }

        $this->seedTargetRecords($service, $employees);
        $this->seedSubmissionRecords($service, $employees, $now);
    }

    /**
     * Clear the IPCR workflow tables before reseeding them.
     */
    private function resetWorkflowData(): void
    {
        $notificationQuery = Notification::query()
            ->where('type', 'like', 'ipcr%')
            ->orWhere(function ($query): void {
                $query
                    ->where('type', 'training_suggestion')
                    ->where('document_type', 'ipcr');
            });

        $auditQuery = IwrAuditLog::query()
            ->whereIn('document_type', ['ipcr', 'ipcr_target']);

        if (DB::getDriverName() === 'sqlite') {
            DB::table('ipcr_appeals')->delete();
            DB::table('ipcr_submissions')->delete();
            DB::table('ipcr_targets')->delete();
            $auditQuery->delete();
            $notificationQuery->delete();

            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('ipcr_appeals')->truncate();
        DB::table('ipcr_submissions')->truncate();
        DB::table('ipcr_targets')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $auditQuery->delete();
        $notificationQuery->delete();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Employee>  $employees
     */
    private function seedTargetRecords(IpcrFormTemplateService $service, $employees): void
    {
        foreach ($employees as $index => $employee) {
            $targetState = $this->targetStateForIndex($index);
            $payload = $this->buildTargetPayload($service, $employee);

            IpcrTarget::query()->create([
                'employee_id' => $employee->employee_id,
                'semester' => 1,
                'target_year' => 2026,
                'form_payload' => $payload,
                'status' => $targetState['status'],
                'submitted_at' => $targetState['submitted_at'],
                'evaluator_id' => 'EMP-001',
                'evaluator_decision' => $targetState['evaluator_decision'],
                'evaluator_remarks' => $targetState['evaluator_remarks'],
                'evaluator_reviewed_at' => $targetState['evaluator_reviewed_at'],
                'hr_finalized' => $targetState['hr_finalized'],
            ]);
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Employee>  $employees
     */
    private function seedSubmissionRecords(IpcrFormTemplateService $service, $employees, CarbonInterface $now): void
    {
        foreach ($employees as $index => $employee) {
            $submissionState = $this->submissionStateForIndex($index, $now);
            $payload = $this->buildSubmissionPayload($service, $employee, $submissionState['score']);

            if ($submissionState['stage'] === 'finalized') {
                $payload = $service->finalize(
                    $payload,
                    $submissionState['score'],
                    $employee,
                    [
                        'final_rater_name' => 'Grace Tan',
                        'head_of_agency_name' => 'Grace Tan',
                        'finalized_date' => $submissionState['finalized_at']->toIso8601String(),
                    ],
                );
            }

            IpcrSubmission::query()->create([
                'employee_id' => $employee->employee_id,
                'performance_rating' => $submissionState['score'],
                'criteria_ratings' => null,
                'form_payload' => $payload,
                'is_first_submission' => $submissionState['is_first_submission'],
                'evaluator_gave_remarks' => $submissionState['evaluator_gave_remarks'],
                'status' => $submissionState['status'],
                'stage' => $submissionState['stage'],
                'routing_action' => $submissionState['routing_action'],
                'evaluator_id' => 'EMP-001',
                'confidence_pct' => 100.00,
                'notification' => $submissionState['notification'],
                'rejection_reason' => $submissionState['rejection_reason'],
                'hr_reviewer_id' => null,
                'hr_decision' => $submissionState['hr_decision'],
                'hr_remarks' => $submissionState['hr_remarks'],
                'hr_cycle_count' => $submissionState['hr_cycle_count'],
                'appeal_status' => $submissionState['appeal_status'],
                'appeal_window_opens_at' => $submissionState['appeal_window_opens_at'],
                'appeal_window_closes_at' => $submissionState['appeal_window_closes_at'],
                'appeal_count' => $submissionState['appeal_count'],
                'pmt_reviewer_id' => null,
                'pmt_decision' => $submissionState['pmt_decision'],
                'pmt_remarks' => $submissionState['pmt_remarks'],
                'pmt_cycle_count' => $submissionState['pmt_cycle_count'],
                'finalized_at' => $submissionState['finalized_at'],
                'final_rating' => $submissionState['final_rating'],
                'adjectival_rating' => $submissionState['adjectival_rating'],
                'is_escalated' => false,
                'escalation_reason' => null,
                'created_at' => $submissionState['created_at'],
                'updated_at' => $submissionState['created_at'],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildTargetPayload(IpcrFormTemplateService $service, Employee $employee): array
    {
        $payload = $service->targetDraft($employee, self::TARGET_PERIOD_LABEL);
        $accountablePrefix = $employee->name.' will';

        foreach ($payload['sections'] as $sectionIndex => $section) {
            foreach ($section['rows'] as $rowIndex => $row) {
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['accountable'] = $accountablePrefix.' '.$row['target'];
            }
        }

        return $payload;
    }

    /**
     * @return array{status: string, submitted_at: \Illuminate\Support\CarbonInterface|null, evaluator_decision: ?string, evaluator_remarks: ?string, evaluator_reviewed_at: \Illuminate\Support\CarbonInterface|null, hr_finalized: bool}
     */
    private function targetStateForIndex(int $index): array
    {
        return match ($index % 4) {
            0 => [
                'status' => 'submitted',
                'submitted_at' => now()->subDays(18 + $index),
                'evaluator_decision' => 'approved',
                'evaluator_remarks' => 'Targets are measurable and aligned with office priorities.',
                'evaluator_reviewed_at' => now()->subDays(16 + $index),
                'hr_finalized' => false,
            ],
            1 => [
                'status' => 'submitted',
                'submitted_at' => now()->subDays(21 + $index),
                'evaluator_decision' => 'rejected',
                'evaluator_remarks' => 'Please refine the measurable outputs before resubmission.',
                'evaluator_reviewed_at' => now()->subDays(19 + $index),
                'hr_finalized' => false,
            ],
            2 => [
                'status' => 'submitted',
                'submitted_at' => now()->subDays(24 + $index),
                'evaluator_decision' => 'approved',
                'evaluator_remarks' => 'Targets have been approved and recorded by HR.',
                'evaluator_reviewed_at' => now()->subDays(22 + $index),
                'hr_finalized' => true,
            ],
            default => [
                'status' => 'draft',
                'submitted_at' => null,
                'evaluator_decision' => null,
                'evaluator_remarks' => null,
                'evaluator_reviewed_at' => null,
                'hr_finalized' => false,
            ],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSubmissionPayload(IpcrFormTemplateService $service, Employee $employee, float $score): array
    {
        $payload = $service->draft($employee, self::SUBMISSION_PERIOD_LABEL);

        foreach ($payload['sections'] as $sectionIndex => $section) {
            foreach ($section['rows'] as $rowIndex => $row) {
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['actual_accomplishment'] = 'Completed '.$row['target'].' with complete documentation and service follow-through.';
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['ratings'] = [
                    'quality' => $score,
                    'efficiency' => $score,
                    'timeliness' => $score,
                ];
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['self_assessment_qeta_scores'] = [
                    'quality' => $score,
                    'efficiency' => $score,
                    'timeliness' => $score,
                    'accountability' => $score,
                ];
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['remarks'] = $this->evaluatorRemarkForRow(
                    (string) $row['id'],
                    (string) $row['target'],
                    $score,
                );
            }
        }

        return $service->hydrate($payload, $employee, [
            'workflow_notes' => [
                'evaluator_remarks' => 'Evaluator comments were recorded per criterion across records handling, compliance, logistics, and service delivery.',
            ],
            'sign_off' => [
                'reviewed_by_name' => 'John Reyes',
                'reviewed_by_date' => now()->toIso8601String(),
            ],
        ]);
    }

    private function evaluatorRemarkForRow(string $rowId, string $target, float $score): string
    {
        $baseRemark = match ($rowId) {
            'personnel-workforce-support' => 'Employee records and staffing requests were handled accurately, with complete endorsements and no missing references.',
            'personnel-policy-compliance' => 'Attendance reminders and policy advisories were issued on time and supported office compliance.',
            'personnel-capability-building' => 'Capability-building follow-through was coordinated well and training actions were endorsed within the semester timeline.',
            'records-document-routing' => 'Incoming and outgoing documents were logged and routed promptly, and the registry remained organized.',
            'records-reporting' => 'Minutes and routine reports were submitted with clear structure and accurate office details.',
            'records-stakeholder-coordination' => 'Correspondence with employees and partner offices was tracked consistently and resolved within turnaround expectations.',
            'logistics-supplies-monitoring' => 'Supply levels and equipment requests were monitored closely, allowing timely replenishment and fewer delays.',
            'logistics-procurement-support' => 'Purchase requests and canvass summaries were prepared with complete supporting documents and good follow-through on deliveries.',
            'logistics-facility-readiness' => 'Workspace readiness and meeting logistics were coordinated effectively, with no major service interruptions.',
            'service-frontline-assistance' => 'Frontline concerns were acknowledged quickly and the requested office services were completed within the expected timeline.',
            'service-process-improvement' => 'Process improvements were identified clearly and the recommended changes were coordinated with the office team.',
            'service-special-assignments' => 'Special assignments and semester-end turnover requirements were completed with solid coordination and complete records.',
            default => 'The work output was acceptable and aligned with the stated target.',
        };

        $tone = match (true) {
            $score >= 4.5 => 'Excellent execution on '.$target.'.',
            $score >= 4.0 => 'Strong performance on '.$target.'.',
            $score >= 3.5 => 'Good performance on '.$target.'.',
            default => 'Please strengthen execution on '.$target.'.',
        };

        return "{$tone} {$baseRemark}";
    }

    /**
     * @return array{
     *     score: float,
     *     created_at: \Illuminate\Support\CarbonInterface,
     *     stage: string,
     *     status: string,
     *     routing_action: string,
     *     evaluator_gave_remarks: bool,
     *     appeal_status: ?string,
     *     appeal_window_opens_at: \Illuminate\Support\CarbonInterface|null,
     *     appeal_window_closes_at: \Illuminate\Support\CarbonInterface|null,
     *     is_first_submission: bool,
     *     finalized_at: \Illuminate\Support\CarbonInterface|null,
     *     final_rating: float|null,
     *     adjectival_rating: string|null,
     *     notification: string,
     *     rejection_reason: string,
     *     hr_cycle_count: int,
     *     pmt_cycle_count: int,
     *     hr_decision: ?string,
     *     hr_remarks: ?string,
     *     pmt_decision: ?string,
     *     pmt_remarks: ?string,
     *     appeal_count: int
     * }
     */
    private function submissionStateForIndex(int $index, CarbonInterface $now): array
    {
        $score = match ($index % 5) {
            0 => 4.50,
            1 => 4.25,
            2 => 4.00,
            3 => 3.75,
            default => 3.50,
        };

        return match ($index % 5) {
            0 => [
                'score' => $score,
                'created_at' => $now->copy()->subDays(12 + $index),
                'stage' => 'sent_to_hr',
                'status' => 'routed',
                'routing_action' => 'route_to_hr',
                'evaluator_gave_remarks' => true,
                'appeal_status' => null,
                'appeal_window_opens_at' => null,
                'appeal_window_closes_at' => null,
                'is_first_submission' => false,
                'finalized_at' => null,
                'final_rating' => null,
                'adjectival_rating' => null,
                'notification' => 'Evaluation saved and routed to HR for checking.',
                'rejection_reason' => 'Evaluator remarks are complete.',
                'hr_cycle_count' => 0,
                'pmt_cycle_count' => 0,
                'hr_decision' => null,
                'hr_remarks' => null,
                'pmt_decision' => null,
                'pmt_remarks' => null,
                'appeal_count' => 0,
            ],
            1 => [
                'score' => $score,
                'created_at' => $now->copy()->subDays(10 + $index),
                'stage' => 'appeal_window_open',
                'status' => 'routed',
                'routing_action' => 'open_appeal_window',
                'evaluator_gave_remarks' => true,
                'appeal_status' => 'appeal_window_open',
                'appeal_window_opens_at' => $now->copy()->subDays(10 + $index),
                'appeal_window_closes_at' => $now->copy()->addDays(3),
                'is_first_submission' => false,
                'finalized_at' => null,
                'final_rating' => null,
                'adjectival_rating' => null,
                'notification' => 'HR reviewed the computation and returned the results to the employee.',
                'rejection_reason' => 'Returned for employee appeal review.',
                'hr_cycle_count' => 1,
                'pmt_cycle_count' => 0,
                'hr_decision' => 'correct',
                'hr_remarks' => 'The computation is correct; the employee may appeal if needed.',
                'pmt_decision' => null,
                'pmt_remarks' => null,
                'appeal_count' => 0,
            ],
            2 => [
                'score' => $score,
                'created_at' => $now->copy()->subDays(8 + $index),
                'stage' => 'sent_to_pmt',
                'status' => 'routed',
                'routing_action' => 'route_to_pmt',
                'evaluator_gave_remarks' => true,
                'appeal_status' => 'no_appeal',
                'appeal_window_opens_at' => null,
                'appeal_window_closes_at' => null,
                'is_first_submission' => false,
                'finalized_at' => null,
                'final_rating' => null,
                'adjectival_rating' => null,
                'notification' => 'No appeal submitted. Routed to PMT review.',
                'rejection_reason' => 'Accepted without appeal.',
                'hr_cycle_count' => 1,
                'pmt_cycle_count' => 0,
                'hr_decision' => 'correct',
                'hr_remarks' => 'Computation accepted by HR.',
                'pmt_decision' => null,
                'pmt_remarks' => null,
                'appeal_count' => 0,
            ],
            3 => [
                'score' => $score,
                'created_at' => $now->copy()->subDays(6 + $index),
                'stage' => 'sent_to_hr_finalize',
                'status' => 'routed',
                'routing_action' => 'route_to_hr_finalize',
                'evaluator_gave_remarks' => true,
                'appeal_status' => 'no_appeal',
                'appeal_window_opens_at' => null,
                'appeal_window_closes_at' => null,
                'is_first_submission' => false,
                'finalized_at' => null,
                'final_rating' => null,
                'adjectival_rating' => null,
                'notification' => 'PMT approved the evaluation and routed it to HR for finalization.',
                'rejection_reason' => 'Ready for HR finalization.',
                'hr_cycle_count' => 1,
                'pmt_cycle_count' => 1,
                'hr_decision' => 'approved',
                'hr_remarks' => 'Ready for HR final recording.',
                'pmt_decision' => 'approved',
                'pmt_remarks' => 'PMT approved the evaluation results.',
                'appeal_count' => 0,
            ],
            default => [
                'score' => $score,
                'created_at' => $now->copy()->subDays(4 + $index),
                'stage' => 'finalized',
                'status' => 'completed',
                'routing_action' => 'finalized',
                'evaluator_gave_remarks' => true,
                'appeal_status' => null,
                'appeal_window_opens_at' => null,
                'appeal_window_closes_at' => null,
                'is_first_submission' => false,
                'finalized_at' => $now->copy()->subDays(2),
                'final_rating' => $score,
                'adjectival_rating' => app(IpcrFormTemplateService::class)->adjectivalRating($score),
                'notification' => 'IPCR finalized.',
                'rejection_reason' => 'Finalized after PMT review.',
                'hr_cycle_count' => 1,
                'pmt_cycle_count' => 1,
                'hr_decision' => 'approved',
                'hr_remarks' => 'Finalized by HR.',
                'pmt_decision' => 'approved',
                'pmt_remarks' => 'PMT approved the evaluation results.',
                'appeal_count' => 0,
            ],
        };
    }
}
