<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use App\Models\IwrAuditLog;
use App\Models\Notification;
use App\Services\IpcrFormTemplateService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Random\Randomizer;

/**
 * Multi-year (2026–2029) attendance + IPCR dataset for the Predictive
 * Performance Evaluation module. Each employee gets:
 *
 *   - Mixed biometric / manual punches every workday across all four years.
 *   - A finalized IPCR target + submission for both semesters of every year.
 *
 * Existing attendance rows are dropped before reseeding. IPCR rows for the
 * covered years are deleted before reseeding so the workflow seeder's
 * demo states are replaced with finalized history for forecasting.
 */
class PerformanceForecastSeeder extends Seeder
{
    /**
     * @var array<int, int>
     */
    private const TARGET_YEARS = [2026, 2027, 2028, 2029];

    private const SHIFT_START = '09:00:00';

    private const SOURCE_MANUAL_RATIO = 0.20;

    public function __construct(
        private readonly IpcrFormTemplateService $template = new IpcrFormTemplateService,
        private readonly Randomizer $rng = new Randomizer,
    ) {}

    public function run(): void
    {
        $employees = Employee::query()
            ->orderBy('employee_id')
            ->get()
            ->reject(fn (Employee $e): bool => $e->employee_id === 'EMP-001')
            ->values();

        if ($employees->isEmpty()) {
            $this->command?->warn('No employees found — skipping performance forecast seeder.');

            return;
        }

        $this->resetAttendance();
        $this->resetIpcrForCoveredYears();

        $this->seedAttendance($employees);
        $this->seedIpcrTargets($employees);
        $this->seedIpcrSubmissions($employees);
    }

    private function resetAttendance(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::table('daily_attendance')->delete();
            DB::table('attendance_records')->delete();

            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('daily_attendance')->truncate();
        DB::table('attendance_records')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    private function resetIpcrForCoveredYears(): void
    {
        $years = self::TARGET_YEARS;

        IpcrTarget::query()->whereIn('target_year', $years)->delete();

        $periodLabels = [];
        foreach ($years as $year) {
            $periodLabels[] = "January to June {$year}";
            $periodLabels[] = "July to December {$year}";
        }

        $submissionIds = IpcrSubmission::query()
            ->whereIn('form_payload->metadata->period', $periodLabels)
            ->pluck('id');

        if ($submissionIds->isNotEmpty()) {
            DB::table('ipcr_appeals')->whereIn('ipcr_submission_id', $submissionIds)->delete();
            IpcrSubmission::query()->whereIn('id', $submissionIds)->delete();
        }

        IwrAuditLog::query()
            ->whereIn('document_type', ['ipcr', 'ipcr_target'])
            ->whereIn(DB::raw('YEAR(created_at)'), $years)
            ->delete();

        Notification::query()
            ->where('type', 'like', 'ipcr%')
            ->whereIn(DB::raw('YEAR(created_at)'), $years)
            ->delete();
    }

    /**
     * @param  Collection<int, Employee>  $employees
     */
    private function seedAttendance(Collection $employees): void
    {
        foreach ($employees as $index => $employee) {
            $archetype = $this->archetypeFor($index);

            $dailyRows = [];
            $punchRows = [];

            foreach (self::TARGET_YEARS as $yearOffset => $year) {
                $start = CarbonImmutable::create($year, 1, 1);
                $end = CarbonImmutable::create($year, 12, 31);
                $holidays = array_flip($this->holidaysFor($year));

                $cursor = $start;
                $dayIndex = 0;

                while ($cursor->lessThanOrEqualTo($end)) {
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
                        $yearOffset,
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

        // Year drift: archetype trend compounds over multiple years so PPE
        // can detect a longitudinal performance signal.
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
            'status' => null,
            'source' => $source,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $punchOut = $timeOut !== null
            ? [
                'employee_id' => $employeeId,
                'date' => $date->toDateString(),
                'punch_time' => $timeOut->toDateTimeString(),
                'status' => null,
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
                // Strong, slightly improving employee.
                'late_rate' => 0.05,
                'incomplete_rate' => 0.01,
                'drift' => -0.01,
                'score_base' => 4.30,
                'score_drift' => 0.08,
            ],
            1 => [
                // Steady performer.
                'late_rate' => 0.10,
                'incomplete_rate' => 0.02,
                'drift' => 0.00,
                'score_base' => 4.05,
                'score_drift' => 0.02,
            ],
            2 => [
                // Sliding performer (more lates over time).
                'late_rate' => 0.08,
                'incomplete_rate' => 0.02,
                'drift' => 0.04,
                'score_base' => 4.20,
                'score_drift' => -0.10,
            ],
            default => [
                // Recovering performer (improves across the years).
                'late_rate' => 0.18,
                'incomplete_rate' => 0.04,
                'drift' => -0.03,
                'score_base' => 3.55,
                'score_drift' => 0.12,
            ],
        };
    }

    /**
     * Philippine regular + special non-working holidays, hand-curated for the
     * covered years. Movable feasts (Holy Week, Eid) approximated to known
     * dates for each year so the seeder is deterministic.
     *
     * @return array<int, string>
     */
    private function holidaysFor(int $year): array
    {
        return match ($year) {
            2026 => [
                '2026-01-01', // New Year's Day
                '2026-04-02', // Maundy Thursday
                '2026-04-03', // Good Friday
                '2026-04-09', // Araw ng Kagitingan
                '2026-05-01', // Labor Day
                '2026-06-12', // Independence Day
                '2026-08-21', // Ninoy Aquino Day
                '2026-08-31', // National Heroes Day
                '2026-11-30', // Bonifacio Day
                '2026-12-25', // Christmas Day
                '2026-12-30', // Rizal Day
                '2026-12-31', // Last Day of the Year
            ],
            2027 => [
                '2027-01-01',
                '2027-03-25', // Maundy Thursday
                '2027-03-26', // Good Friday
                '2027-04-09',
                '2027-05-01',
                '2027-06-12',
                '2027-08-21',
                '2027-08-30', // National Heroes Day (last Mon of August)
                '2027-11-30',
                '2027-12-25',
                '2027-12-30',
                '2027-12-31',
            ],
            2028 => [
                '2028-01-01',
                '2028-04-13', // Maundy Thursday
                '2028-04-14', // Good Friday
                '2028-04-09',
                '2028-05-01',
                '2028-06-12',
                '2028-08-21',
                '2028-08-28',
                '2028-11-30',
                '2028-12-25',
                '2028-12-30',
                '2028-12-31',
            ],
            2029 => [
                '2029-01-01',
                '2029-03-29', // Maundy Thursday
                '2029-03-30', // Good Friday
                '2029-04-09',
                '2029-05-01',
                '2029-06-12',
                '2029-08-21',
                '2029-08-27',
                '2029-11-30',
                '2029-12-25',
                '2029-12-30',
                '2029-12-31',
            ],
            default => [],
        };
    }

    /**
     * @param  Collection<int, Employee>  $employees
     */
    private function seedIpcrTargets(Collection $employees): void
    {
        foreach ($employees as $index => $employee) {
            foreach (self::TARGET_YEARS as $year) {
                foreach ([1, 2] as $semester) {
                    $semesterLabel = $semester === 1 ? 'First Semester' : 'Second Semester';
                    $periodLabel = "{$semesterLabel} {$year}";

                    $payload = $this->buildTargetPayload($employee, $periodLabel, $index, $year);

                    $submittedAt = $semester === 1
                        ? CarbonImmutable::create($year, 1, 8, 9, 0)
                        : CarbonImmutable::create($year, 7, 5, 9, 0);

                    IpcrTarget::query()->create([
                        'employee_id' => $employee->employee_id,
                        'semester' => $semester,
                        'target_year' => $year,
                        'form_payload' => $payload,
                        'status' => 'submitted',
                        'submitted_at' => $submittedAt,
                        'evaluator_id' => 'EMP-001',
                        'evaluator_decision' => 'approved',
                        'evaluator_remarks' => 'Targets are aligned with office priorities and measurable.',
                        'evaluator_reviewed_at' => $submittedAt->addDays(2),
                        'hr_finalized' => true,
                    ]);
                }
            }
        }
    }

    /**
     * @param  Collection<int, Employee>  $employees
     */
    private function seedIpcrSubmissions(Collection $employees): void
    {
        foreach ($employees as $index => $employee) {
            $archetype = $this->archetypeFor($index);

            foreach (self::TARGET_YEARS as $yearOffset => $year) {
                foreach ([1, 2] as $semester) {
                    $semesterLabel = $semester === 1 ? 'First Semester' : 'Second Semester';
                    $periodLabel = $semester === 1
                        ? "January to June {$year}"
                        : "July to December {$year}";

                    $score = $this->scoreFor($archetype, $year, $yearOffset, $semester);

                    $finalizedAt = $semester === 1
                        ? CarbonImmutable::create($year, 7, 10, 16, 0)
                        : CarbonImmutable::create($year + 1, 1, 10, 16, 0);

                    $payload = $this->buildSubmissionPayload(
                        $employee,
                        $periodLabel,
                        $score,
                        $finalizedAt,
                    );

                    IpcrSubmission::query()->create([
                        'employee_id' => $employee->employee_id,
                        'performance_rating' => $score,
                        'criteria_ratings' => null,
                        'form_payload' => $payload,
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
                        'hr_remarks' => 'Finalized by HR.',
                        'hr_cycle_count' => 1,
                        'appeal_status' => 'no_appeal',
                        'appeal_window_opens_at' => null,
                        'appeal_window_closes_at' => null,
                        'appeal_count' => 0,
                        'pmt_reviewer_id' => null,
                        'pmt_decision' => 'approved',
                        'pmt_remarks' => 'PMT approved the evaluation results.',
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
            }
        }
    }

    /**
     * Compose the rating per (year, semester) so PPE sees a longitudinal
     * trend: each year's score moves by the archetype drift, each semester
     * adds a smaller intra-year delta.
     *
     * @param  array{score_base: float, score_drift: float}  $archetype
     */
    private function scoreFor(array $archetype, int $year, int $yearOffset, int $semester): float
    {
        $yearDelta = $archetype['score_drift'] * $yearOffset;
        $semesterDelta = $semester === 1 ? 0.0 : $archetype['score_drift'] * 0.5;
        $score = round($archetype['score_base'] + $yearDelta + $semesterDelta, 2);

        return max(2.0, min(5.0, $score));
    }

    /**
     * @return array<string, mixed>
     */
    private function buildTargetPayload(Employee $employee, string $periodLabel, int $index, int $year): array
    {
        $payload = $this->template->targetDraft($employee, $periodLabel);
        $accountablePrefix = $employee->name.' will';

        $verbs = [
            'lead', 'document', 'coordinate', 'track', 'review',
            'streamline', 'monitor', 'submit', 'organize', 'analyze',
        ];

        // Cycle the verb across employees AND years so each year's targets
        // read differently while staying aligned to the same criterion.
        $yearShift = $year - self::TARGET_YEARS[0];

        foreach ($payload['sections'] as $sectionIndex => $section) {
            foreach ($section['rows'] as $rowIndex => $row) {
                $verb = $verbs[($index + $rowIndex + $yearShift) % count($verbs)];
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['accountable'] =
                    "{$accountablePrefix} {$verb} the following: ".$row['target'];
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
    ): array {
        $payload = $this->template->draft($employee, $periodLabel);

        foreach ($payload['sections'] as $sectionIndex => $section) {
            foreach ($section['rows'] as $rowIndex => $row) {
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['actual_accomplishment'] =
                    'Completed '.$row['target'].' with full documentation and follow-through across the period.';
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['ratings'] = [
                    'quality' => $score,
                    'efficiency' => $score,
                    'timeliness' => $score,
                ];
                $payload['sections'][$sectionIndex]['rows'][$rowIndex]['remarks'] =
                    'Performance for '.$row['target'].' was rated '.$score.' for the period.';
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
}
