<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\User;

class IpcrFormTemplateService
{
    /**
     * @return array<string, mixed>
     */
    public function draft(?Employee $employee, string $periodLabel, ?string $employeeName = null): array
    {
        return $this->hydrate(null, $employee, [
            'metadata' => [
                'period' => $periodLabel,
                'employee_name' => $employeeName ?? $employee?->name,
            ],
            'sign_off' => [
                'pmt_chair_name' => $this->roleHolderName(User::ROLE_PMT),
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $payload
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public function hydrate(?array $payload, ?Employee $employee = null, array $overrides = []): array
    {
        $base = $this->baseTemplate($employee);
        $incoming = $payload ?? [];

        $metadata = array_replace_recursive($base['metadata'], $incoming['metadata'] ?? [], $overrides['metadata'] ?? []);
        $summary = array_replace_recursive($base['summary'], $incoming['summary'] ?? [], $overrides['summary'] ?? []);
        $workflowNotes = array_replace_recursive($base['workflow_notes'], $incoming['workflow_notes'] ?? [], $overrides['workflow_notes'] ?? []);
        $signOff = array_replace_recursive($base['sign_off'], $incoming['sign_off'] ?? [], $overrides['sign_off'] ?? []);
        $finalization = array_replace_recursive($base['finalization'], $incoming['finalization'] ?? [], $overrides['finalization'] ?? []);

        $sectionMap = collect($incoming['sections'] ?? [])
            ->keyBy(fn (array $section): string => (string) ($section['id'] ?? ''));

        $sections = collect($base['sections'])->map(function (array $section) use ($sectionMap): array {
            $incomingSection = $sectionMap->get($section['id'], []);
            $rowMap = collect($incomingSection['rows'] ?? [])
                ->keyBy(fn (array $row): string => (string) ($row['id'] ?? ''));

            $section['rows'] = collect($section['rows'])->map(function (array $row) use ($rowMap): array {
                $incomingRow = $rowMap->get($row['id'], []);
                $row['actual_accomplishment'] = (string) ($incomingRow['actual_accomplishment'] ?? $row['actual_accomplishment']);
                $row['ratings'] = [
                    'quality' => $this->normalizeRating($incomingRow['ratings']['quality'] ?? $row['ratings']['quality']),
                    'efficiency' => $this->normalizeRating($incomingRow['ratings']['efficiency'] ?? $row['ratings']['efficiency']),
                    'timeliness' => $this->normalizeRating($incomingRow['ratings']['timeliness'] ?? $row['ratings']['timeliness']),
                ];
                $row['average'] = $this->calculateAverage($row['ratings']);
                $row['remarks'] = (string) ($incomingRow['remarks'] ?? $row['remarks']);

                return $row;
            })->all();

            return $section;
        })->all();

        $computedRows = collect($sections)
            ->flatMap(fn (array $section): array => $section['rows'])
            ->filter(fn (array $row): bool => $row['average'] !== null)
            ->values();

        $computedRating = $computedRows->isEmpty()
            ? null
            : round($computedRows->avg(fn (array $row): float => (float) $row['average']), 2);

        $summary['computed_rating'] = $computedRating;
        $summary['rated_rows'] = $computedRows->count();
        $summary['adjectival_rating'] = $computedRating !== null
            ? $this->adjectivalRating($computedRating)
            : null;

        if (($finalization['final_rating'] ?? null) !== null && $finalization['final_rating'] !== '') {
            $finalization['final_rating'] = round((float) $finalization['final_rating'], 2);
            $finalization['adjectival_rating'] = $this->adjectivalRating((float) $finalization['final_rating']);
        } elseif ($computedRating !== null) {
            $finalization['final_rating'] = $computedRating;
            $finalization['adjectival_rating'] = $summary['adjectival_rating'];
        }

        return [
            'template_version' => 'v1-paper-form',
            'metadata' => $metadata,
            'sections' => $sections,
            'workflow_notes' => $workflowNotes,
            'summary' => $summary,
            'sign_off' => $signOff,
            'finalization' => $finalization,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $payload
     * @param  array<string, mixed>  $signOff
     * @return array<string, mixed>
     */
    public function finalize(?array $payload, float $finalRating, ?Employee $employee = null, array $signOff = []): array
    {
        return $this->hydrate($payload, $employee, [
            'finalization' => [
                'final_rating' => round($finalRating, 2),
                'adjectival_rating' => $this->adjectivalRating($finalRating),
                'finalized_at' => now()->toIso8601String(),
            ],
            'sign_off' => $signOff,
        ]);
    }

    public function adjectivalRating(float $score): string
    {
        if ($score >= 4.5) {
            return 'Outstanding';
        }

        if ($score >= 3.5) {
            return 'Very Satisfactory';
        }

        if ($score >= 2.5) {
            return 'Satisfactory';
        }

        if ($score >= 1.5) {
            return 'Unsatisfactory';
        }

        return 'Poor';
    }

    /**
     * @return array<string, mixed>
     */
    private function baseTemplate(?Employee $employee): array
    {
        return [
            'template_version' => 'v1-paper-form',
            'metadata' => [
                'country' => null,
                'organization' => null,
                'city' => null,
                'department' => 'Administrative Office',
                'form_title' => 'Individual Performance Commitment and Review',
                'period' => 'January to June 2026',
                'employee_name' => $employee?->name,
                'employee_position' => $employee?->job_title,
            ],
            'sections' => [
                [
                    'id' => 'personnel-management',
                    'title' => 'Personnel Management',
                    'rows' => [
                        $this->row(
                            'personnel-workforce-support',
                            'Coordinate employee records, plantilla movement, and office staffing requirements.',
                            "Maintain updated personnel files.\nTrack designation, leave endorsements, and internal staffing requests.",
                            'All personnel transactions are documented accurately and endorsed within the semester timeline.',
                            'Administrative officer and assigned records staff.'
                        ),
                        $this->row(
                            'personnel-policy-compliance',
                            'Facilitate compliance with office policies, attendance standards, and internal memos.',
                            null,
                            'Office advisories and compliance reminders are released on time with complete documentation.',
                            'Administrative office personnel.'
                        ),
                        $this->row(
                            'personnel-capability-building',
                            'Coordinate capability-building plans, mentoring, and performance follow-through for office personnel.',
                            null,
                            'Training plans and coaching actions are identified and endorsed before the close of the rating period.',
                            'Section heads and administrative office focal persons.'
                        ),
                    ],
                ],
                [
                    'id' => 'records-and-communication',
                    'title' => 'Records and Communication',
                    'rows' => [
                        $this->row(
                            'records-document-routing',
                            'Receive, log, route, and archive incoming and outgoing administrative documents.',
                            "Track memoranda, endorsements, and requests.\nMaintain records registry and retrieval log.",
                            'Documents are routed and archived with complete metadata and no missing references.',
                            'Records custodian and communication desk.'
                        ),
                        $this->row(
                            'records-reporting',
                            'Prepare routine administrative reports, minutes, and office communications.',
                            null,
                            'Required reports and communications are submitted before deadline with clear and accurate content.',
                            'Administrative office reporting team.'
                        ),
                        $this->row(
                            'records-stakeholder-coordination',
                            'Coordinate official correspondence with employees, supervisors, and partner offices.',
                            null,
                            'Requests and communications are acknowledged, tracked, and resolved within the prescribed turnaround time.',
                            'Assigned liaison and records personnel.'
                        ),
                    ],
                ],
                [
                    'id' => 'logistics-and-procurement',
                    'title' => 'Logistics and Procurement',
                    'rows' => [
                        $this->row(
                            'logistics-supplies-monitoring',
                            'Monitor office supplies, equipment requests, and inventory availability for administrative operations.',
                            null,
                            'Inventory and supply requests are monitored accurately with timely replenishment actions.',
                            'Supply custodian and administrative office support staff.'
                        ),
                        $this->row(
                            'logistics-procurement-support',
                            'Prepare purchase requests, canvass summaries, and logistics endorsements for office needs.',
                            "Support procurement documentation.\nTrack delivery status and receiving acknowledgments.",
                            'Procurement-related documents are complete, traceable, and submitted within target turnaround time.',
                            'Administrative procurement support personnel.'
                        ),
                        $this->row(
                            'logistics-facility-readiness',
                            'Coordinate workspace readiness, equipment upkeep, and logistics support for meetings or office activities.',
                            null,
                            'Meeting venues, materials, and administrative logistics are prepared without service disruptions.',
                            'Logistics and facilities support team.'
                        ),
                    ],
                ],
                [
                    'id' => 'service-delivery',
                    'title' => 'Service Delivery',
                    'rows' => [
                        $this->row(
                            'service-frontline-assistance',
                            'Provide prompt frontline administrative assistance for employee and office transactions.',
                            "Assist walk-in and referred concerns.\nTrack completion of requested office documents or services.",
                            'Service requests are acknowledged promptly and completed within agreed service standards.',
                            'Frontline administrative support personnel.'
                        ),
                        $this->row(
                            'service-process-improvement',
                            'Recommend and implement process improvements that reduce administrative delays or repeat issues.',
                            null,
                            'Improvement actions are documented, coordinated, and reflected in office operations during the semester.',
                            'Administrative office process owners.'
                        ),
                        $this->row(
                            'service-special-assignments',
                            'Support cross-functional office activities, special assignments, and semester-end evaluation requirements.',
                            null,
                            'Special assignments are completed with coordinated service support and complete turnover records.',
                            'Assigned administrative office personnel.'
                        ),
                    ],
                ],
            ],
            'workflow_notes' => [
                'employee_notes' => '',
                'evaluator_remarks' => '',
                'hr_remarks' => '',
                'pmt_remarks' => '',
                'appeal_reason' => '',
            ],
            'summary' => [
                'computed_rating' => null,
                'rated_rows' => 0,
                'adjectival_rating' => null,
            ],
            'sign_off' => [
                'ratee_name' => $employee?->name,
                'reviewed_by_name' => null,
                'pmt_chair_name' => $this->roleHolderName(User::ROLE_PMT),
                'final_rater_name' => null,
                'head_of_agency_name' => null,
                'ratee_date' => null,
                'reviewed_by_date' => null,
                'pmt_date' => null,
                'finalized_date' => null,
            ],
            'finalization' => [
                'final_rating' => null,
                'adjectival_rating' => null,
                'finalized_at' => null,
            ],
        ];
    }

    private function roleHolderName(string $role): ?string
    {
        return User::query()
            ->where('role', $role)
            ->orderBy('name')
            ->value('name');
    }

    /**
     * @return array<string, mixed>
     */
    private function row(
        string $id,
        string $target,
        ?string $targetDetails,
        string $measures,
        string $accountable,
    ): array {
        return [
            'id' => $id,
            'target' => $target,
            'target_details' => $targetDetails,
            'measures' => $measures,
            'accountable' => $accountable,
            'actual_accomplishment' => '',
            'ratings' => [
                'quality' => null,
                'efficiency' => null,
                'timeliness' => null,
            ],
            'average' => null,
            'remarks' => '',
        ];
    }

    /**
     * @param  array<string, float|int|string|null>  $ratings
     */
    private function calculateAverage(array $ratings): ?float
    {
        $values = collect($ratings)
            ->map(fn (float|int|string|null $value): ?float => $value === null || $value === '' ? null : round((float) $value, 2))
            ->filter(fn (?float $value): bool => $value !== null)
            ->values();

        if ($values->isEmpty()) {
            return null;
        }

        return round($values->avg(), 2);
    }

    private function normalizeRating(float|int|string|null $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $rating = round((float) $value, 2);

        if ($rating < 1 || $rating > 5) {
            return null;
        }

        return $rating;
    }
}
