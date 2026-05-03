<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\IpcrTarget;
use App\Services\IpcrFormTemplateService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Seeds fully approved and HR-finalized First Semester 2026 IPCR targets for
 * every Administrative Office employee (EMP-002 through EMP-021). Submissions
 * are dated within November 2025 with evaluator approval recorded a few days
 * later. Replaces any mixed-state targets produced by IpcrWorkflowSeeder so
 * the upcoming-semester target line in the Predictive Performance chart
 * has a stable, realistic data set to render.
 */
class IpcrApprovedTargetsSeeder extends Seeder
{
    private const TARGET_PERIOD_LABEL = 'First Semester 2026';

    private const TARGET_YEAR = 2026;

    private const TARGET_SEMESTER = 1;

    private const FIRST_EMPLOYEE_ID = 'EMP-002';

    private const LAST_EMPLOYEE_ID = 'EMP-021';

    public function run(): void
    {
        $service = app(IpcrFormTemplateService::class);

        $employees = Employee::query()
            ->whereBetween('employee_id', [self::FIRST_EMPLOYEE_ID, self::LAST_EMPLOYEE_ID])
            ->orderBy('employee_id')
            ->get();

        foreach ($employees as $index => $employee) {
            IpcrTarget::query()
                ->where('employee_id', $employee->employee_id)
                ->where('semester', self::TARGET_SEMESTER)
                ->where('target_year', self::TARGET_YEAR)
                ->delete();

            $submittedAt = Carbon::create(2025, 11, 3, 8, 30)->addDays($index);
            $reviewedAt = $submittedAt->copy()->addDays(2)->setTime(14, 15);

            IpcrTarget::query()->create([
                'employee_id' => $employee->employee_id,
                'semester' => self::TARGET_SEMESTER,
                'target_year' => self::TARGET_YEAR,
                'form_payload' => $this->buildPayload($service, $employee),
                'status' => 'submitted',
                'submitted_at' => $submittedAt,
                'evaluator_id' => 'EMP-001',
                'evaluator_decision' => 'approved',
                'evaluator_remarks' => 'Targets reviewed and approved for the First Semester 2026 cycle.',
                'evaluator_reviewed_at' => $reviewedAt,
                'hr_finalized' => true,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(IpcrFormTemplateService $service, Employee $employee): array
    {
        $payload = $service->targetDraft($employee, self::TARGET_PERIOD_LABEL);

        foreach ($payload['sections'] as $sectionIndex => $section) {
            foreach ($section['rows'] as $rowIndex => $row) {
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['accountable'] = $this->accountableTargetFor((string) $row['id']);
            }
        }

        return $payload;
    }

    public static function accountableTargetFor(string $rowId): string
    {
        return match ($rowId) {
            'personnel-workforce-support' => 'Maintain complete and updated 201 files for assigned personnel, process designation and leave endorsements within two working days, and submit a monthly staffing movement summary to the office head.',
            'personnel-policy-compliance' => 'Issue weekly attendance and policy advisories, monitor compliance with internal memos, and coordinate with HR on flagged cases within three working days of identification.',
            'personnel-capability-building' => 'Identify training needs per section, endorse at least two capability-building activities, and submit a coaching follow-through report before the close of the semester.',
            'records-document-routing' => 'Log and route all incoming and outgoing documents within the same working day, maintain the records registry without backlog, and produce a weekly routing status summary.',
            'records-reporting' => 'Prepare meeting minutes within two working days of every official meeting and submit all required administrative reports at least one day before each deadline.',
            'records-stakeholder-coordination' => 'Acknowledge official correspondence within one working day, track open communications in the liaison log, and resolve standard requests within the prescribed turnaround time.',
            'logistics-supplies-monitoring' => 'Conduct weekly inventory checks, raise replenishment requests before stock levels fall below the reorder point, and submit a monthly supply utilization report.',
            'logistics-procurement-support' => 'Prepare purchase requests with complete supporting documents, monitor delivery status until full acceptance, and ensure receiving acknowledgments are filed on the day of delivery.',
            'logistics-facility-readiness' => 'Coordinate venue, equipment, and materials at least one day before scheduled office activities, and confirm post-activity teardown and turnover within the same day.',
            'service-frontline-assistance' => 'Acknowledge frontline requests on first contact, resolve standard transactions within the published service standards, and refer non-routine concerns with complete handover notes.',
            'service-process-improvement' => 'Document at least one process improvement action per quarter, coordinate the change with affected personnel, and validate the result before the end of the semester.',
            'service-special-assignments' => 'Complete assigned special tasks within agreed timelines, prepare turnover and accomplishment notes for each, and submit a semester-end summary to the office head.',
            default => 'Deliver the assigned office output within the agreed timeline, with complete supporting records and clear handover notes.',
        };
    }
}
