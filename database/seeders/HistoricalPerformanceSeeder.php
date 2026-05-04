<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use App\Models\IwrAuditLog;
use App\Models\Notification;
use App\Services\Biometric\ZlinkPortalClient;
use App\Services\IpcrFormTemplateService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Random\Randomizer;
use Throwable;

/**
 * Seeds the historical IPCR + attendance dataset that powers the historical
 * data table, Predictive Performance Evaluation, Daily Attendance Logs and
 * Semestral Performance widgets.
 *
 *   - IPCR targets and finalized submissions for every semester from 2021
 *     through 2025 (10 finalized periods per fully-tenured Admin Office
 *     employee). Every submission is finalized by HR and PMT.
 *   - Daily attendance + biometric punches for every workday from
 *     2021-01-01 through today. Weekends and Philippine holidays are
 *     skipped, so the May 1 (Labor Day) → May 3 weekend window is
 *     naturally excluded. Records start from each employee's hire
 *     date so newly-hired employees have shorter histories.
 */
class HistoricalPerformanceSeeder extends Seeder
{
    /**
     * @var array<int, int>
     */
    private const HISTORICAL_YEARS = [2021, 2022, 2023, 2024, 2025];

    private const ATTENDANCE_START = '2021-01-01';

    private const SHIFT_START = '08:00:00';

    private const SOURCE_MANUAL_RATIO = 0.20;

    public function __construct(
        private readonly IpcrFormTemplateService $template = new IpcrFormTemplateService,
        private readonly Randomizer $rng = new Randomizer,
    ) {}

    public function run(): void
    {
        $employees = Employee::query()
            ->with('department')
            ->whereHas('department', fn ($query) => $query->where('name', 'Administrative Office'))
            ->where('employee_id', '!=', 'EMP-001')
            ->orderBy('employee_id')
            ->get();

        if ($employees->isEmpty()) {
            $this->command?->warn('No Admin Office employees found — skipping historical performance seeder.');

            return;
        }

        $this->resetState();
        $this->seedAttendance($employees);
        $this->seedIpcrTargetsAndSubmissions($employees);
    }

    private function resetState(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::table('daily_attendance')->delete();
            DB::table('attendance_records')->delete();
            DB::table('ipcr_appeals')->delete();
            DB::table('ipcr_submissions')->delete();
            DB::table('ipcr_targets')->delete();
            DB::table('historical_data_records')->delete();
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            DB::table('daily_attendance')->truncate();
            DB::table('attendance_records')->truncate();
            DB::table('ipcr_appeals')->truncate();
            DB::table('ipcr_submissions')->truncate();
            DB::table('ipcr_targets')->truncate();
            DB::table('historical_data_records')->truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        IwrAuditLog::query()
            ->whereIn('document_type', ['ipcr', 'ipcr_target'])
            ->delete();

        Notification::query()
            ->where(function ($query): void {
                $query->where('type', 'like', 'ipcr%')
                    ->orWhere(function ($inner): void {
                        $inner->where('type', 'training_suggestion')
                            ->where('document_type', 'ipcr');
                    });
            })
            ->delete();
    }

    /**
     * @param  Collection<int, Employee>  $employees
     */
    private function seedAttendance(Collection $employees): void
    {
        // Seed every workday up to and including today. May 1 (Labor Day)
        // and the May 2–3 weekend are skipped by the holiday/weekend filter
        // below, so they don't need a special-case cutoff.
        $cutoff = CarbonImmutable::today();
        $attendanceLowerBound = CarbonImmutable::parse(self::ATTENDANCE_START);
        $portal = app(ZlinkPortalClient::class);

        foreach ($employees as $index => $employee) {
            if (! $this->hasZlinkFingerprint($employee, $portal)) {
                $this->command?->info(
                    "Skipping attendance for {$employee->employee_id} — no fingerprint template on Zlink yet."
                );

                continue;
            }

            $archetype = $this->archetypeFor($index);

            $hireDate = $employee->date_hired
                ? CarbonImmutable::parse($employee->date_hired)
                : $attendanceLowerBound;

            $start = $hireDate->isBefore($attendanceLowerBound) ? $attendanceLowerBound : $hireDate;
            $startYear = $start->year;

            $cursor = $start;
            $dayIndex = 0;
            $dailyRows = [];
            $punchRows = [];

            while ($cursor->lessThanOrEqualTo($cutoff)) {
                $year = $cursor->year;
                $holidays = array_flip($this->holidaysFor($year));
                $dateString = $cursor->toDateString();

                if ($cursor->isWeekend() || isset($holidays[$dateString])) {
                    $cursor = $cursor->addDay();
                    $dayIndex++;

                    continue;
                }

                $row = $this->buildDailyRow(
                    $employee->employee_id,
                    $cursor,
                    $archetype,
                    $year - $startYear,
                    $dayIndex,
                );

                $dailyRows[] = $row['daily'];
                $punchRows[] = $row['punch_in'];
                if ($row['punch_out'] !== null) {
                    $punchRows[] = $row['punch_out'];
                }

                $cursor = $cursor->addDay();
                $dayIndex++;
            }

            foreach (array_chunk($dailyRows, 250) as $chunk) {
                DB::table('daily_attendance')->insert($chunk);
            }

            foreach (array_chunk($punchRows, 500) as $chunk) {
                DB::table('attendance_records')->insert($chunk);
            }
        }
    }

    /**
     * Canonical "is enrolled" check used by the seeder: only employees with
     * a real fingerprint template on the Zlink terminal get historical
     * attendance backfilled. Re-running the seeder after a new enrollment
     * picks up the just-enrolled employee.
     *
     * Uses the SPA-validated `cms/credential/employee/list` endpoint via
     * ZlinkPortalClient::findCredentialIdsByEmployeeCode. The
     * fingerprint/devices endpoint and the open-API
     * /biometric/v1/fingerprints/search both lag behind cloud reality on
     * this tenant, so they would falsely report "no fingerprint" for
     * employees that actually have a credential registered.
     */
    private function hasZlinkFingerprint(Employee $employee, ZlinkPortalClient $portal): bool
    {
        if (empty($employee->zkteco_pin)) {
            return false;
        }

        try {
            $credentials = $portal->findCredentialIdsByEmployeeCode((string) $employee->zkteco_pin);
        } catch (Throwable) {
            return false;
        }

        return $credentials !== [];
    }

    /**
     * @param  array<string, float>  $archetype
     * @return array{
     *     daily: array<string, mixed>,
     *     punch_in: array<string, mixed>,
     *     punch_out: array<string, mixed>|null
     * }
     */
    private function buildDailyRow(
        string $employeeId,
        CarbonImmutable $date,
        array $archetype,
        int $yearOffset,
        int $dayIndex,
    ): array {
        $shiftStart = Carbon::parse($date->toDateString().' '.self::SHIFT_START);

        $yearDrift = $archetype['drift'] * $yearOffset;
        $intraYearTrend = min(1.0, max(0.0, $dayIndex / 260.0));
        $latenessRate = max(0.02, $archetype['late_rate'] + $yearDrift + $archetype['drift'] * $intraYearTrend * 0.5);
        $incompleteRate = max(0.0, $archetype['incomplete_rate'] + $yearDrift * 0.5);

        $roll = $this->rng->getFloat(0, 1);

        $isLate = $roll < $latenessRate;
        $isIncomplete = $roll < $incompleteRate;

        if ($isLate) {
            $minutesPastShift = $this->rng->getInt(5, 45);
            $timeIn = $shiftStart->copy()->addMinutes($minutesPastShift);
            $lateMinutes = $minutesPastShift;
        } else {
            $minutesBeforeShift = $this->rng->getInt(5, 30);
            $timeIn = $shiftStart->copy()->subMinutes($minutesBeforeShift);
            $lateMinutes = 0;
        }

        $timeOut = null;
        if (! $isIncomplete) {
            $closing = Carbon::parse($date->toDateString().' 17:00:00');
            $timeOut = $closing->copy()->addMinutes($this->rng->getInt(0, 90));
        }

        $sourceRoll = $this->rng->getFloat(0, 1);
        $source = $sourceRoll < self::SOURCE_MANUAL_RATIO ? 'manual' : 'biometric';

        $status = $isIncomplete ? 'incomplete' : ($isLate ? 'late' : 'on_time');

        $now = Carbon::now();

        $daily = [
            'employee_id' => $employeeId,
            'date' => $date->toDateString(),
            'time_in' => $timeIn->format('H:i:s'),
            'time_out' => $timeOut?->format('H:i:s'),
            'status' => $status,
            'late_minutes' => $lateMinutes,
            'source' => $source,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $punchIn = [
            'employee_id' => $employeeId,
            'date' => $date->toDateString(),
            'punch_time' => $timeIn->toDateTimeString(),
            'status' => $isLate ? 'Late' : 'Present',
            'source' => $source,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $punchOut = $timeOut !== null
            ? [
                'employee_id' => $employeeId,
                'date' => $date->toDateString(),
                'punch_time' => $timeOut->toDateTimeString(),
                'status' => 'Present',
                'source' => $source,
                'created_at' => $now,
                'updated_at' => $now,
            ]
            : null;

        return [
            'daily' => $daily,
            'punch_in' => $punchIn,
            'punch_out' => $punchOut,
        ];
    }

    /**
     * @return array{late_rate: float, incomplete_rate: float, drift: float, score_base: float, score_drift: float}
     */
    private function archetypeFor(int $index): array
    {
        return match ($index % 4) {
            0 => [
                'late_rate' => 0.05,
                'incomplete_rate' => 0.01,
                'drift' => -0.01,
                'score_base' => 4.30,
                'score_drift' => 0.08,
            ],
            1 => [
                'late_rate' => 0.10,
                'incomplete_rate' => 0.02,
                'drift' => 0.00,
                'score_base' => 4.05,
                'score_drift' => 0.02,
            ],
            2 => [
                'late_rate' => 0.08,
                'incomplete_rate' => 0.02,
                'drift' => 0.04,
                'score_base' => 4.20,
                'score_drift' => -0.10,
            ],
            default => [
                'late_rate' => 0.18,
                'incomplete_rate' => 0.04,
                'drift' => -0.03,
                'score_base' => 3.55,
                'score_drift' => 0.12,
            ],
        };
    }

    /**
     * Philippine regular + special non-working holidays for 2021–2026.
     * Movable feasts (Holy Week) approximated to known dates so the seeder
     * is deterministic.
     *
     * @return array<int, string>
     */
    private function holidaysFor(int $year): array
    {
        return match ($year) {
            2021 => [
                '2021-01-01', '2021-04-01', '2021-04-02', '2021-04-09',
                '2021-05-01', '2021-06-12', '2021-08-21', '2021-08-30',
                '2021-11-30', '2021-12-25', '2021-12-30', '2021-12-31',
            ],
            2022 => [
                '2022-01-01', '2022-04-14', '2022-04-15', '2022-04-09',
                '2022-05-01', '2022-06-12', '2022-08-21', '2022-08-29',
                '2022-11-30', '2022-12-25', '2022-12-30', '2022-12-31',
            ],
            2023 => [
                '2023-01-01', '2023-04-06', '2023-04-07', '2023-04-09',
                '2023-05-01', '2023-06-12', '2023-08-21', '2023-08-28',
                '2023-11-30', '2023-12-25', '2023-12-30', '2023-12-31',
            ],
            2024 => [
                '2024-01-01', '2024-03-28', '2024-03-29', '2024-04-09',
                '2024-05-01', '2024-06-12', '2024-08-21', '2024-08-26',
                '2024-11-30', '2024-12-25', '2024-12-30', '2024-12-31',
            ],
            2025 => [
                '2025-01-01', '2025-04-17', '2025-04-18', '2025-04-09',
                '2025-05-01', '2025-06-12', '2025-08-21', '2025-08-25',
                '2025-11-30', '2025-12-25', '2025-12-30', '2025-12-31',
            ],
            2026 => [
                '2026-01-01', '2026-04-02', '2026-04-03', '2026-04-09',
                '2026-05-01', '2026-06-12', '2026-08-21', '2026-08-31',
                '2026-11-30', '2026-12-25', '2026-12-30', '2026-12-31',
            ],
            default => [],
        };
    }

    /**
     * @param  Collection<int, Employee>  $employees
     */
    private function seedIpcrTargetsAndSubmissions(Collection $employees): void
    {
        foreach ($employees as $index => $employee) {
            $archetype = $this->archetypeFor($index);
            $hireDate = $employee->date_hired
                ? CarbonImmutable::parse($employee->date_hired)
                : CarbonImmutable::parse(self::ATTENDANCE_START);

            foreach (self::HISTORICAL_YEARS as $yearOffset => $year) {
                foreach ([1, 2] as $semester) {
                    $semesterStart = $semester === 1
                        ? CarbonImmutable::create($year, 1, 1)
                        : CarbonImmutable::create($year, 7, 1);

                    if ($hireDate->isAfter($semesterStart)) {
                        continue;
                    }

                    $this->seedSinglePeriod($employee, $archetype, $index, $year, $yearOffset, $semester);
                }
            }
        }
    }

    /**
     * @param  array{score_base: float, score_drift: float}  $archetype
     */
    private function seedSinglePeriod(
        Employee $employee,
        array $archetype,
        int $index,
        int $year,
        int $yearOffset,
        int $semester,
    ): void {
        $semesterLabel = $semester === 1 ? 'First Semester' : 'Second Semester';
        $targetPeriodLabel = "{$semesterLabel} {$year}";
        $submissionPeriodLabel = $semester === 1
            ? "January to June {$year}"
            : "July to December {$year}";

        $score = $this->scoreFor($archetype, $yearOffset, $semester);

        $submittedAt = $semester === 1
            ? CarbonImmutable::create($year, 1, 8, 9, 0)
            : CarbonImmutable::create($year, 7, 5, 9, 0);

        $finalizedAt = $semester === 1
            ? CarbonImmutable::create($year, 7, 10, 16, 0)
            : CarbonImmutable::create($year + 1, 1, 10, 16, 0);

        IpcrTarget::query()->create([
            'employee_id' => $employee->employee_id,
            'semester' => $semester,
            'target_year' => $year,
            'form_payload' => $this->buildTargetPayload($employee, $targetPeriodLabel, $index, $year, $semester),
            'status' => 'submitted',
            'submitted_at' => $submittedAt,
            'evaluator_id' => 'EMP-001',
            'evaluator_decision' => 'approved',
            'evaluator_remarks' => $this->targetEvaluatorRemarkFor($year, $semester),
            'evaluator_reviewed_at' => $submittedAt->addDays(2),
            'hr_finalized' => true,
        ]);

        $submissionPayload = $this->buildSubmissionPayload(
            $employee,
            $submissionPeriodLabel,
            $score,
            $finalizedAt,
            $year,
            $semester,
        );

        IpcrSubmission::query()->create([
            'employee_id' => $employee->employee_id,
            'performance_rating' => $score,
            'criteria_ratings' => null,
            'form_payload' => $submissionPayload,
            'is_first_submission' => false,
            'evaluator_gave_remarks' => true,
            'status' => 'completed',
            'stage' => 'finalized',
            'routing_action' => 'finalized',
            'evaluator_id' => 'EMP-001',
            'confidence_pct' => 100.00,
            'notification' => "{$semesterLabel} {$year} IPCR finalized.",
            'rejection_reason' => 'Finalized after PMT review.',
            'hr_reviewer_id' => null,
            'hr_decision' => 'approved',
            'hr_remarks' => $this->hrRemarkFor($score, $year, $semester),
            'hr_cycle_count' => 1,
            'appeal_status' => 'no_appeal',
            'appeal_window_opens_at' => null,
            'appeal_window_closes_at' => null,
            'appeal_count' => 0,
            'pmt_reviewer_id' => null,
            'pmt_decision' => 'approved',
            'pmt_remarks' => $this->pmtRemarkFor($score, $year, $semester),
            'pmt_cycle_count' => 1,
            'finalized_at' => $finalizedAt,
            'final_rating' => $score,
            'adjectival_rating' => $this->template->adjectivalRating($score),
            'is_escalated' => false,
            'escalation_reason' => null,
            'created_at' => $finalizedAt->subDays(7),
            'updated_at' => $finalizedAt,
        ]);
    }

    /**
     * @param  array{score_base: float, score_drift: float}  $archetype
     */
    private function scoreFor(array $archetype, int $yearOffset, int $semester): float
    {
        $yearDelta = $archetype['score_drift'] * $yearOffset;
        $semesterDelta = $semester === 1 ? 0.0 : $archetype['score_drift'] * 0.5;
        $score = round($archetype['score_base'] + $yearDelta + $semesterDelta, 2);

        return max(2.0, min(5.0, $score));
    }

    /**
     * @return array<string, mixed>
     */
    private function buildTargetPayload(Employee $employee, string $periodLabel, int $index, int $year, int $semester): array
    {
        unset($index);

        $payload = $this->template->targetDraft($employee, $periodLabel);

        foreach ($payload['sections'] as $sectionIndex => $section) {
            foreach ($section['rows'] as $rowIndex => $row) {
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['accountable'] =
                    IpcrApprovedTargetsSeeder::accountableTargetFor((string) $row['id'], $year, $semester);
            }
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSubmissionPayload(
        Employee $employee,
        string $periodLabel,
        float $score,
        CarbonImmutable $finalizedAt,
        int $year,
        int $semester,
    ): array {
        $payload = $this->template->draft($employee, $periodLabel);

        foreach ($payload['sections'] as $sectionIndex => $section) {
            foreach ($section['rows'] as $rowIndex => $row) {
                $rowId = (string) ($row['id'] ?? '');
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['actual_accomplishment'] =
                    $this->accomplishmentFor($rowId, $year, $semester);
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['ratings'] = [
                    'quality' => $score,
                    'efficiency' => $score,
                    'timeliness' => $score,
                ];
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['remarks'] =
                    $this->criterionRemarkFor($rowId, $score, $year, $semester);
            }
        }

        return $this->template->finalize(
            $payload,
            $score,
            $employee,
            [
                'final_rater_name' => 'Grace Tan',
                'head_of_agency_name' => 'Grace Tan',
                'finalized_date' => $finalizedAt->toIso8601String(),
            ],
        );
    }

    /**
     * Period-aware accomplishment narrative that mirrors what was committed
     * for the given row id. Variant rotation matches the target seeder so
     * the accomplishment lines up with the accountable text seeded for the
     * same (rowId, year, semester) tuple.
     */
    private function accomplishmentFor(string $rowId, int $year, int $semester): string
    {
        $variants = $this->accomplishmentVariantsFor($rowId);
        $count = count($variants);
        $index = (($year - 2021) * 2 + ($semester - 1)) % $count;

        if ($index < 0) {
            $index += $count;
        }

        return $variants[$index];
    }

    /**
     * @return array<int, string>
     */
    private function accomplishmentVariantsFor(string $rowId): array
    {
        return match ($rowId) {
            'personnel-workforce-support' => [
                'Maintained complete and updated 201 files for all assigned personnel, processed 18 designation and leave endorsements within the two-day standard, and submitted the monthly staffing movement summary on or before the 5th of each month.',
                'Reconciled the personnel master list against payroll and plantilla records, closed 94% of pending employee transactions ahead of the period, and reduced average endorsement turnaround to one working day.',
                'Produced the semester-end personnel movement report covering 22 hires, separations, designations, and leaves, with all supporting documents filed, indexed, and audit-ready.',
                'Coordinated quarterly personnel updates with HR and section heads, validated all vacancy postings, and consolidated staffing requests into a single endorsement memo per cycle without backlog.',
            ],
            'personnel-policy-compliance' => [
                'Issued weekly attendance and policy advisories on schedule, monitored compliance across all sections, and coordinated with HR on every flagged case within three working days.',
                'Audited attendance and leave compliance per section monthly, escalated three persistent gaps, and recommended corrective actions that were adopted before the close of the period.',
                'Documented compliance findings in the semester report covering all infractions, resolutions, and policy clarifications issued during the cycle.',
                'Conducted policy refresher briefings for all assigned sections, secured acknowledgment from every employee, and tracked outstanding compliance items to closure within the period.',
            ],
            'personnel-capability-building' => [
                'Identified training needs across all assigned sections, endorsed three capability-building activities, and submitted the coaching follow-through report ahead of the semester deadline.',
                'Rolled out the semester learning calendar, secured 86% participation from identified attendees, and validated post-training application within the 30-day window.',
                'Compiled the semester capability development report per section with attendance, evaluation results, and recommended next-step interventions for the next cycle.',
                'Coordinated with section heads to align capability plans with operational priorities, endorsed four mentoring pairs, and reviewed progress at the period midpoint as scheduled.',
            ],
            'records-document-routing' => [
                'Logged and routed every incoming and outgoing document on the same working day, kept the records registry backlog-free, and produced the weekly routing status summary without exception.',
                'Reduced average document turnaround time by 1.2 working days this period, retired stale registry entries, and digitized incoming priority documents on receipt.',
                'Submitted the semester records routing report including volume, turnaround, and exception handling, accepted by the office head without revision.',
                'Coordinated cross-office routing with partner units, confirmed receipt of all dispatched documents, and resolved missing-reference cases within the two-day standard.',
            ],
            'records-reporting' => [
                'Prepared meeting minutes within two working days of every official meeting and submitted all required administrative reports at least one day before each deadline.',
                'Standardized the reporting templates used across the office, published a unified reporting calendar, and pre-validated data before each submission.',
                'Delivered the consolidated semester accomplishment report with verified metrics, narratives, and supporting attachments, accepted on first submission.',
                'Coordinated report inputs from each section, reconciled differences before consolidation, and circulated drafts for review ahead of every final submission.',
            ],
            'records-stakeholder-coordination' => [
                'Acknowledged official correspondence within one working day, tracked open communications in the liaison log, and resolved standard requests within the prescribed turnaround.',
                'Reduced the backlog of open correspondence by 53% this period and tightened escalation thresholds for items overdue beyond five working days.',
                'Compiled the semester correspondence summary tracking volume, average turnaround, and resolution outcomes per stakeholder group.',
                'Conducted the quarterly liaison meeting with partner offices, documented agreed action items, and followed through to closure within the same period.',
            ],
            'logistics-supplies-monitoring' => [
                'Conducted weekly inventory checks, raised replenishment requests before stock levels fell below the reorder point, and submitted the monthly supply utilization report on time.',
                'Drove stock-out incidents to zero this semester by tightening reorder thresholds and aligning consumption forecasts with actual usage trends.',
                'Submitted the semester supplies utilization report with consumption analysis, pricing trends, and recommended adjustments to the standard stock list.',
                'Coordinated inventory reconciliation with property custodians, validated all supply requests against approved plans, and resolved variances before the close of the period.',
            ],
            'logistics-procurement-support' => [
                'Prepared purchase requests with complete supporting documents, monitored delivery status until full acceptance, and filed every receiving acknowledgment on the day of delivery.',
                'Shortened average procurement document turnaround by two working days and pre-validated specifications with end-users before canvassing.',
                'Submitted the semester procurement support report covering processed requests, delivery performance, and outstanding items endorsed for follow-through.',
                'Coordinated with the property and accounting units on pending acceptance and payment items, and reconciled all open procurement records before the close of the period.',
            ],
            'logistics-facility-readiness' => [
                'Coordinated venue, equipment, and materials at least one day ahead of every scheduled office activity, and confirmed post-activity teardown and turnover within the same day.',
                'Standardized the activity readiness checklist, conducted walk-throughs ahead of every major office event, and resolved facility issues before they affected operations.',
                'Submitted the semester facility readiness report covering activities supported, recurring issues, and recommendations for upgrade or repair.',
                'Coordinated with facility services on equipment maintenance schedules, confirmed meeting room availability ahead of weekly cycles, and validated post-activity restoration without exception.',
            ],
            'service-frontline-assistance' => [
                'Acknowledged frontline requests on first contact, resolved standard transactions within published service standards, and referred non-routine concerns with complete handover notes.',
                'Reduced repeat visits this semester by improving first-contact resolution, published the updated client guide, and tightened the referral handoff process.',
                'Submitted the semester frontline service report including request volume, resolution time, and client feedback themes, accepted by the office head.',
                'Coordinated with concerned sections on every flagged frontline issue, documented the resolution path, and closed cases within the agreed turnaround.',
            ],
            'service-process-improvement' => [
                'Documented two process improvement actions this period, coordinated each change with affected personnel, and validated the resulting turnaround gains before the end of the semester.',
                'Piloted a streamlining initiative on the highest-volume service this period and benchmarked turnaround before and after, confirming a measurable improvement.',
                'Compiled the semester process improvement report covering implemented changes, measurable impact, and follow-through actions for the next cycle.',
                'Coordinated improvement workshops with affected personnel, documented the agreed changes, and aligned them with existing internal procedures before rollout.',
            ],
            'service-special-assignments' => [
                'Completed all assigned special tasks within agreed timelines, prepared turnover and accomplishment notes for each, and submitted the semester-end summary to the office head.',
                'Streamlined the handling of recurring special assignments, identified reusable templates and checklists, and shortened preparation time across the period.',
                'Submitted the semester special assignments report with task descriptions, completion status, and lessons learned for institutional reference.',
                'Coordinated with assigning officials on overlapping commitments, sequenced deliverables to avoid bottlenecks, and confirmed acceptance of every completed output.',
            ],
            default => [
                'Delivered the assigned office output within the agreed timeline, with complete supporting records and clear handover notes.',
                'Improved the assigned office output this period through documented streamlining and validated turnaround gains.',
                'Reported on the assigned office output for the semester, covering volume, turnaround, and notable exceptions.',
                'Coordinated the assigned office output with affected sections, confirmed acceptance, and closed out open items before the period ended.',
            ],
        };
    }

    /**
     * Per-criterion (Q/E/T) evaluator remark that reflects the score band and
     * the row's operational focus. Avoids canned filler.
     */
    private function criterionRemarkFor(string $rowId, float $score, int $year, int $semester): string
    {
        $band = $this->scoreBand($score);
        $variants = match ($band) {
            'outstanding' => [
                'Outputs were consistently on time, fully documented, and exceeded the committed standards across all three criteria for the period.',
                'Quality and timeliness were sustained throughout the semester with measurable gains over the prior cycle and no rework required.',
                'Performance exceeded the committed targets across quality, efficiency, and timeliness, with documented follow-through on every deliverable.',
                'Delivered above expectations on every committed output, with strong supporting records and zero missed turnarounds for the period.',
            ],
            'very_satisfactory' => [
                'Met all committed outputs on time with good quality and minimal revisions; efficiency held steady against the prior period baseline.',
                'Performance was reliable across the period — quality was solid, turnarounds met the standard, and exceptions were resolved without escalation.',
                'Targets were achieved consistently with sound documentation; one or two outputs ran close to the deadline but were delivered on time.',
                'Demonstrated steady performance across quality, efficiency, and timeliness, with appropriate coordination on shared deliverables.',
            ],
            'satisfactory' => [
                'Committed outputs were delivered, though one or two ran past the standard turnaround; quality was acceptable and corrections were addressed within the period.',
                'Performance met the baseline expectation; recommend tightening turnaround on routine items and pre-validating outputs before final submission.',
                'Outputs were completed but required minor follow-up to close gaps; efficiency can be improved by front-loading documentation early in the cycle.',
                'Targets were met at the standard level; opportunities remain to lift quality through earlier coordination with affected sections.',
            ],
            default => [
                'Performance fell short of the committed standard for the period; recommend a structured coaching plan and tighter monitoring next cycle.',
                'Several deliverables ran past the committed turnaround; supporting records were incomplete on review and require corrective action.',
                'Outputs did not consistently meet the quality and timeliness standards committed at the start of the period; follow-through is needed.',
                'Performance gaps were observed across the criteria; recommend a focused improvement plan and check-ins at the period midpoint.',
            ],
        };

        $count = count($variants);
        $hash = abs(crc32($rowId.':'.$year.':'.$semester));
        $index = $hash % $count;

        return $variants[$index];
    }

    private function targetEvaluatorRemarkFor(int $year, int $semester): string
    {
        $variants = [
            'Targets are aligned with office priorities for the period and the success indicators are measurable. Approved as committed.',
            'Reviewed against the operational plan — targets are specific, time-bound, and within the employee\'s scope of responsibility. Approved.',
            'Targets reflect both routine accountabilities and at least one improvement-focused commitment. No revisions required.',
            'Approved. Targets cover the core deliverables for the semester and include clear quality and turnaround standards.',
        ];

        $index = (($year - 2021) * 2 + ($semester - 1)) % count($variants);
        if ($index < 0) {
            $index += count($variants);
        }

        return $variants[$index];
    }

    private function hrRemarkFor(float $score, int $year, int $semester): string
    {
        $band = $this->scoreBand($score);
        $variants = match ($band) {
            'outstanding' => [
                'HR review complete. Ratings are well supported by the actual accomplishments and consistent with prior period trends. Finalized for filing.',
                'Documentation and ratings reconciled with the period accountabilities; no inconsistencies observed. Finalized.',
                'Reviewed against attendance, leave, and supporting records — no exceptions noted. Finalized for the period.',
            ],
            'very_satisfactory' => [
                'HR review complete. Accomplishments substantiate the ratings and the supporting records are in order. Finalized.',
                'Ratings are consistent with the documented outputs for the period. No revisions required. Finalized.',
                'Reviewed and reconciled with attendance and leave records. Finalized for filing.',
            ],
            'satisfactory' => [
                'HR review complete. Ratings align with the documented accomplishments; recommend a development conversation ahead of the next cycle. Finalized.',
                'Accomplishments support the rating. Endorsing a coaching note for the next period. Finalized.',
                'Reviewed and finalized. A capability-building activity is recommended for the next cycle to lift performance.',
            ],
            default => [
                'HR review complete. Performance gaps noted are consistent with the documentation. A formal improvement plan is being routed separately. Finalized.',
                'Ratings align with the documented shortfalls for the period. Endorsed for performance coaching ahead of the next cycle. Finalized.',
                'Reviewed and finalized. Recommend close monitoring and a midpoint check-in during the next period.',
            ],
        };

        $index = abs(crc32('hr:'.$year.':'.$semester)) % count($variants);

        return $variants[$index];
    }

    private function pmtRemarkFor(float $score, int $year, int $semester): string
    {
        $band = $this->scoreBand($score);
        $variants = match ($band) {
            'outstanding' => [
                'PMT concurs with the rating. Performance for the period is well documented and consistent with the office\'s assessment.',
                'PMT review complete — the accomplishments fully support the rating. No adjustment.',
                'Endorsed by PMT. The employee\'s contribution is clearly evidenced and the rating is sustained.',
            ],
            'very_satisfactory' => [
                'PMT concurs with the rating. Outputs and supporting records align with the assessment.',
                'PMT review complete. The rating is supported by the documented accomplishments for the period.',
                'Endorsed by PMT. Performance is consistent with the committed targets for the period.',
            ],
            'satisfactory' => [
                'PMT concurs with the rating. Recommend the office consider a development plan ahead of the next cycle.',
                'PMT review complete. Rating is sustained; coaching notes endorsed for the next period.',
                'Endorsed by PMT with a recommendation to strengthen turnaround consistency next cycle.',
            ],
            default => [
                'PMT concurs with the rating. Performance gaps are documented; a structured improvement plan is endorsed for the next period.',
                'PMT review complete. Rating is sustained. Recommend monthly check-ins during the next cycle.',
                'Endorsed by PMT. A formal performance improvement plan should accompany the next period\'s targets.',
            ],
        };

        $index = abs(crc32('pmt:'.$year.':'.$semester)) % count($variants);

        return $variants[$index];
    }

    private function scoreBand(float $score): string
    {
        if ($score >= 4.5) {
            return 'outstanding';
        }
        if ($score >= 3.5) {
            return 'very_satisfactory';
        }
        if ($score >= 2.5) {
            return 'satisfactory';
        }

        return 'unsatisfactory';
    }
}
