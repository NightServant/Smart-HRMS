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

    private const SHIFT_START = '09:00:00';

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
            'evaluator_remarks' => 'Targets are aligned with office priorities and measurable.',
            'evaluator_reviewed_at' => $submittedAt->addDays(2),
            'hr_finalized' => true,
        ]);

        $submissionPayload = $this->buildSubmissionPayload(
            $employee,
            $submissionPeriodLabel,
            $score,
            $finalizedAt,
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
