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

    /**
     * Base year used for variant rotation. Variant index is computed as
     * ((year - BASE_YEAR) * 2 + (semester - 1)) % VARIANT_COUNT, guaranteeing
     * adjacent semesters always pick a different variant.
     */
    private const VARIANT_BASE_YEAR = 2021;

    private const VARIANT_COUNT = 4;

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
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['accountable'] =
                    self::accountableTargetFor((string) $row['id'], self::TARGET_YEAR, self::TARGET_SEMESTER);
            }
        }

        return $payload;
    }

    /**
     * Pick a real, period-specific accountable for the given row.
     *
     * Adjacent semesters always rotate to a different variant so each
     * (year, semester) pair tells a slightly different operational story
     * even though the base accountabilities stay rooted in the role.
     */
    public static function accountableTargetFor(string $rowId, int $year, int $semester): string
    {
        $variants = self::variantsFor($rowId);
        $index = (($year - self::VARIANT_BASE_YEAR) * 2 + ($semester - 1)) % self::VARIANT_COUNT;

        if ($index < 0) {
            $index += self::VARIANT_COUNT;
        }

        return $variants[$index];
    }

    /**
     * @return array<int, string>
     */
    private static function variantsFor(string $rowId): array
    {
        return match ($rowId) {
            'personnel-workforce-support' => [
                'Maintain complete and updated 201 files for assigned personnel, process designation and leave endorsements within two working days, and submit a monthly staffing movement summary to the office head.',
                'Reconcile the personnel master list with payroll and plantilla records, close at least 90% of pending employee transactions before the period ends, and shorten endorsement turnaround to one working day.',
                'Produce a semester-end personnel movement report covering hires, separations, designations, and leaves, with all supporting documents filed and indexed for audit.',
                'Coordinate quarterly personnel updates with HR and section heads, validate vacancy postings, and consolidate staffing requests into a single endorsement memo per cycle.',
            ],
            'personnel-policy-compliance' => [
                'Issue weekly attendance and policy advisories, monitor compliance with internal memos, and coordinate with HR on flagged cases within three working days of identification.',
                'Audit attendance and leave compliance per section monthly, escalate persistent gaps, and recommend corrective actions before the close of the period.',
                'Document compliance findings in a semester report with summarized infractions, resolutions, and policy clarifications issued during the cycle.',
                'Conduct a policy refresher briefing for assigned sections, confirm acknowledgment from each employee, and track follow-through on outstanding compliance items.',
            ],
            'personnel-capability-building' => [
                'Identify training needs per section, endorse at least two capability-building activities, and submit a coaching follow-through report before the close of the semester.',
                'Roll out the semester learning calendar, secure participation from at least 80% of identified attendees, and validate post-training application within 30 days.',
                'Compile a semester capability development report per section with attendance, evaluation results, and recommended next-step interventions.',
                'Coordinate with section heads to align capability plans with operational priorities, endorse mentoring pairs, and review progress at the period midpoint.',
            ],
            'records-document-routing' => [
                'Log and route all incoming and outgoing documents within the same working day, maintain the records registry without backlog, and produce a weekly routing status summary.',
                'Reduce average document turnaround time by at least one working day this period, retire stale registry entries, and digitize incoming priority documents on receipt.',
                'Submit a semester records routing report including volume, turnaround, and exception handling for review by the office head.',
                'Coordinate cross-office routing with partner units, confirm receipt of dispatched documents, and resolve missing-reference cases within two working days.',
            ],
            'records-reporting' => [
                'Prepare meeting minutes within two working days of every official meeting and submit all required administrative reports at least one day before each deadline.',
                'Standardize the reporting templates used across the office, publish a unified reporting calendar, and pre-validate data before submission.',
                'Deliver a consolidated semester accomplishment report with verified metrics, narratives, and supporting attachments.',
                'Coordinate report inputs from each section, reconcile differences before consolidation, and circulate drafts for review before final submission.',
            ],
            'records-stakeholder-coordination' => [
                'Acknowledge official correspondence within one working day, track open communications in the liaison log, and resolve standard requests within the prescribed turnaround time.',
                'Reduce the backlog of open correspondence by 50% this period and tighten escalation thresholds for items overdue beyond five working days.',
                'Compile a semester correspondence summary tracking volume, average turnaround, and resolution outcomes per stakeholder group.',
                'Conduct a quarterly liaison meeting with partner offices, document agreed action items, and follow through to closure within the same period.',
            ],
            'logistics-supplies-monitoring' => [
                'Conduct weekly inventory checks, raise replenishment requests before stock levels fall below the reorder point, and submit a monthly supply utilization report.',
                'Drive stock-out incidents to zero this semester by tightening reorder thresholds and aligning consumption forecasts with actual usage trends.',
                'Submit a semester supplies utilization report with consumption analysis, pricing trends, and recommended adjustments to the standard stock list.',
                'Coordinate inventory reconciliation with property custodians, validate supply requests against approved plans, and resolve variances before the close of the period.',
            ],
            'logistics-procurement-support' => [
                'Prepare purchase requests with complete supporting documents, monitor delivery status until full acceptance, and ensure receiving acknowledgments are filed on the day of delivery.',
                'Shorten the average procurement document turnaround by two working days and pre-validate specifications with end-users before canvassing.',
                'Submit a semester procurement support report covering processed requests, delivery performance, and outstanding items endorsed for follow-through.',
                'Coordinate with the property and accounting units on pending acceptance and payment items, and reconcile open procurement records before the close of the period.',
            ],
            'logistics-facility-readiness' => [
                'Coordinate venue, equipment, and materials at least one day before scheduled office activities, and confirm post-activity teardown and turnover within the same day.',
                'Standardize the activity readiness checklist, conduct walk-throughs ahead of every major office event, and resolve facility issues before they affect operations.',
                'Submit a semester facility readiness report covering activities supported, recurring issues, and recommendations for upgrade or repair.',
                'Coordinate with facility services on equipment maintenance schedules, confirm meeting room availability ahead of weekly cycles, and validate post-activity restoration.',
            ],
            'service-frontline-assistance' => [
                'Acknowledge frontline requests on first contact, resolve standard transactions within the published service standards, and refer non-routine concerns with complete handover notes.',
                'Reduce repeat visits by improving first-contact resolution, publish updated client guides, and tighten the referral handoff process this semester.',
                'Submit a semester frontline service report including request volume, resolution time, and client feedback themes for review by the office head.',
                'Coordinate with concerned sections on flagged frontline issues, document the resolution path, and close cases within agreed turnaround.',
            ],
            'service-process-improvement' => [
                'Document at least one process improvement action per quarter, coordinate the change with affected personnel, and validate the result before the end of the semester.',
                'Pilot a streamlining initiative on the highest-volume service this period and benchmark turnaround before and after implementation.',
                'Compile a semester process improvement report covering implemented changes, measurable impact, and follow-through actions for the next cycle.',
                'Coordinate improvement workshops with affected personnel, document agreed changes, and align them with existing internal procedures.',
            ],
            'service-special-assignments' => [
                'Complete assigned special tasks within agreed timelines, prepare turnover and accomplishment notes for each, and submit a semester-end summary to the office head.',
                'Streamline the handling of recurring special assignments, identify reusable templates and checklists, and shorten preparation time this period.',
                'Submit a semester special assignments report with task descriptions, completion status, and lessons learned for institutional reference.',
                'Coordinate with assigning officials on overlapping commitments, sequence deliverables to avoid bottlenecks, and confirm acceptance of completed outputs.',
            ],
            default => [
                'Deliver the assigned office output within the agreed timeline, with complete supporting records and clear handover notes.',
                'Improve the assigned office output this period through documented streamlining and validated turnaround gains.',
                'Report on the assigned office output for the semester, covering volume, turnaround, and notable exceptions.',
                'Coordinate the assigned office output with affected sections, confirming acceptance and closing out open items before the period ends.',
            ],
        };
    }
}
