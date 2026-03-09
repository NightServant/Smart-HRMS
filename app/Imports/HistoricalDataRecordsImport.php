<?php

namespace App\Imports;

use App\Models\HistoricalDataRecord;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class HistoricalDataRecordsImport implements ToCollection, WithHeadingRow
{
    /**
     * @param  Collection<int, Collection<int|string, mixed>>  $rows
     */
    public function collection(Collection $rows): void
    {
        $rows
            ->map(function (Collection $row): ?array {
                $employeeName = $this->valueFromRow($row, ['employee_name', 'name']);
                $departmentName = $this->valueFromRow($row, ['department', 'department_name']);
                $year = $this->valueFromRow($row, ['year']);
                $quarter = $this->valueFromRow($row, ['quarter']);
                $rate = $this->valueFromRow($row, ['attendance_rate_pct', 'attendance_punctuality_rate', 'attendance_and_punctuality_rate']);
                $absenteeismDays = $this->valueFromRow($row, ['absenteeism_days']);
                $tardinessIncidents = $this->valueFromRow($row, ['tardiness_incidents']);
                $trainingStatus = $this->valueFromRow($row, ['training_completion_status']);
                $score = $this->valueFromRow($row, ['evaluated_performance_score']);

                if (
                    $employeeName === null ||
                    $departmentName === null ||
                    $year === null ||
                    $quarter === null ||
                    $rate === null ||
                    $trainingStatus === null ||
                    $score === null
                ) {
                    return null;
                }

                return [
                    'employee_name' => $employeeName,
                    'department_name' => $departmentName,
                    'year' => (int) $year,
                    'quarter' => $quarter,
                    'attendance_punctuality_rate' => $rate,
                    'absenteeism_days' => (int) ($absenteeismDays ?? 0),
                    'tardiness_incidents' => (int) ($tardinessIncidents ?? 0),
                    'training_completion_status' => (int) $trainingStatus,
                    'evaluated_performance_score' => (float) $score,
                ];
            })
            ->filter()
            ->each(function (array $payload): void {
                HistoricalDataRecord::query()->create($payload);
            });
    }

    private function valueFromRow(Collection $row, array $expectedKeys): ?string
    {
        $normalizedExpectedKeys = array_map(
            fn (string $key): string => $this->normalizeHeader($key),
            $expectedKeys
        );

        foreach ($row as $key => $value) {
            $normalizedHeader = $this->normalizeHeader((string) $key);
            if (in_array($normalizedHeader, $normalizedExpectedKeys, true)) {
                $stringValue = trim((string) $value);

                return $stringValue === '' ? null : $stringValue;
            }
        }

        return null;
    }

    private function normalizeHeader(string $header): string
    {
        $headerWithoutBom = str_replace("\xEF\xBB\xBF", '', $header);
        $headerWithUnderscores = preg_replace('/[^a-z0-9]+/i', '_', trim($headerWithoutBom));

        return trim(strtolower((string) $headerWithUnderscores), '_');
    }
}
