<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportAttendanceRequest;
use App\Models\AttendanceRecord;
use App\Services\ActivityLogger;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class AttendanceImportController extends Controller
{
    public function store(ImportAttendanceRequest $request): RedirectResponse
    {
        try {
            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());
            $path = $file->store('temp', 'local');
            $filePath = storage_path('app/private/'.$path);

            // Parse rows based on file type
            $rows = $this->parseFile($filePath, $extension);

            if (empty($rows)) {
                @unlink($filePath);

                return redirect()
                    ->route('admin.attendance-management')
                    ->with('error', 'No data found in the file.');
            }

            // Pre-load all employees into lookup maps (1 query)
            $allEmployees = Employee::all();
            $employeeById = $allEmployees->keyBy('employee_id');
            $employeeByName = $allEmployees->keyBy('name');

            // Pre-load existing attendance records for dedup (1 query)
            $existingRecords = AttendanceRecord::select('employee_id', 'punch_time')
                ->get()
                ->map(fn ($r) => $r->employee_id.'|'.$r->punch_time)
                ->flip()
                ->all();

            $successCount = 0;
            $errorCount = 0;
            $errors = [];
            $toInsert = [];
            $now = now();

            foreach ($rows as $lineNumber => $data) {
                try {
                    $personId = trim($data['Person ID'] ?? '');
                    $personName = trim($data['Person Name'] ?? '');
                    $punchTime = trim($data['Punch Time'] ?? '');

                    if (empty($personId)) {
                        $errorCount++;
                        $errors[] = "Line {$lineNumber}: Missing Person ID";

                        continue;
                    }

                    if (! $this->isValidDateTime($punchTime)) {
                        $errorCount++;
                        $errors[] = "Line {$lineNumber}: Invalid punch time format. Expected: YYYY-MM-DD HH:MM:SS";

                        continue;
                    }

                    // Resolve employee from pre-loaded maps
                    $employee = $employeeById[$personId] ?? null;
                    if (! $employee && ! empty($personName)) {
                        $employee = $employeeByName[$personName] ?? null;
                    }

                    if (! $employee) {
                        $errorCount++;
                        $errors[] = "Line {$lineNumber}: Employee not found (ID: {$personId}, Name: {$personName})";

                        continue;
                    }

                    $employeeId = $employee->employee_id;
                    $punchDateTime = Carbon::createFromFormat('Y-m-d H:i:s', $punchTime);
                    $date = $punchDateTime->toDateString();
                    $dedupKey = $employeeId.'|'.$punchDateTime->format('Y-m-d H:i:s');

                    // Check for duplicate in DB or current batch
                    if (isset($existingRecords[$dedupKey])) {
                        $errorCount++;
                        $errors[] = "Line {$lineNumber}: Duplicate record (Employee: {$employeeId}, Time: {$punchTime})";

                        continue;
                    }

                    $status = $punchDateTime->hour >= 9 ? 'Late' : 'Present';

                    $toInsert[] = [
                        'employee_id' => $employeeId,
                        'date' => $date,
                        'punch_time' => $punchDateTime->format('Y-m-d H:i:s'),
                        'status' => $status,
                        'source' => 'import',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];

                    // Mark as existing to prevent duplicates within the same file
                    $existingRecords[$dedupKey] = true;
                    $successCount++;
                } catch (\Exception $e) {
                    $errorCount++;
                    $errors[] = "Line {$lineNumber}: {$e->getMessage()}";
                }
            }

            // Batch insert inside a transaction
            if (! empty($toInsert)) {
                DB::transaction(function () use ($toInsert) {
                    foreach (array_chunk($toInsert, 500) as $chunk) {
                        AttendanceRecord::insert($chunk);
                    }
                });
            }

            @unlink($filePath);

            ActivityLogger::logDataImport('attendance', $successCount, $request);

            $message = "Import completed: {$successCount} records imported";
            if ($errorCount > 0) {
                $message .= ", {$errorCount} errors";
                if (count($errors) <= 10) {
                    $message .= '. '.implode('; ', $errors);
                } else {
                    $message .= '. First 10 errors: '.implode('; ', array_slice($errors, 0, 10));
                }
            }

            return redirect()
                ->route('admin.attendance-management')
                ->with('success', $message);
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Import failed: '.$e->getMessage());
        }
    }

    /**
     * Clear all attendance records.
     */
    public function destroy(): RedirectResponse
    {
        try {
            $count = AttendanceRecord::where('source', 'import')->count();
            AttendanceRecord::where('source', 'import')->delete();

            ActivityLogger::logDataImport('attendance-clear', $count, request());

            return redirect()
                ->route('admin.attendance-management')
                ->with('success', "Cleared {$count} attendance records.");
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Failed to clear records: '.$e->getMessage());
        }
    }

    /**
     * Parse file into rows based on extension.
     *
     * @return array<int, array<string, string>>
     */
    private function parseFile(string $filePath, string $extension): array
    {
        // Detect actual file type by reading magic bytes (XLSX files disguised as .csv)
        $isExcel = in_array($extension, ['xlsx', 'xls']);

        if (! $isExcel) {
            $handle = fopen($filePath, 'rb');
            if ($handle) {
                $header = fread($handle, 4);
                fclose($handle);
                // PK signature (ZIP/XLSX) or OLE2 signature (XLS)
                if ($header !== false && (str_starts_with($header, "PK") || str_starts_with($header, "\xD0\xCF\x11\xE0"))) {
                    $isExcel = true;
                }
            }
        }

        if ($isExcel) {
            return $this->parseExcel($filePath);
        }

        return $this->parseCsv($filePath);
    }

    /**
     * Parse XLSX/XLS file using PhpSpreadsheet.
     *
     * @return array<int, array<string, string>>
     */
    private function parseExcel(string $filePath): array
    {
        $reader = IOFactory::createReaderForFile($filePath);
        $spreadsheet = $reader->load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();
        $highestCol = $sheet->getHighestColumn();

        // Find the header row (contains "Person ID")
        $headerRow = null;
        $header = [];

        for ($row = 1; $row <= min(10, $highestRow); $row++) {
            $firstCell = (string) $sheet->getCell('A'.$row)->getValue();
            if (stripos($firstCell, 'Person ID') !== false) {
                $headerRow = $row;

                foreach (range('A', $highestCol) as $col) {
                    $val = trim((string) $sheet->getCell($col.$row)->getValue());
                    if ($val !== '') {
                        $header[$col] = $val;
                    }
                }

                break;
            }
        }

        if (! $headerRow || empty($header)) {
            return [];
        }

        $rows = [];

        for ($row = $headerRow + 1; $row <= $highestRow; $row++) {
            $record = [];
            $hasData = false;

            foreach ($header as $col => $name) {
                $cellValue = $sheet->getCell($col.$row)->getValue();

                // Convert Excel serial dates to datetime strings
                if ($name === 'Punch Time' && is_numeric($cellValue)) {
                    $dateTime = ExcelDate::excelToDateTimeObject((float) $cellValue);
                    $cellValue = $dateTime->format('Y-m-d H:i:s');
                }

                $record[$name] = (string) ($cellValue ?? '');
                if ($record[$name] !== '') {
                    $hasData = true;
                }
            }

            if ($hasData) {
                $rows[$row] = $record;
            }
        }

        return $rows;
    }

    /**
     * Parse CSV/TXT file using fgetcsv.
     *
     * @return array<int, array<string, string>>
     */
    private function parseCsv(string $filePath): array
    {
        $rows = [];

        if (($handle = fopen($filePath, 'r')) !== false) {
            $header = fgetcsv($handle);
            $lineNumber = 1;

            while (($row = fgetcsv($handle)) !== false) {
                $lineNumber++;
                $data = array_combine($header, $row);
                if ($data) {
                    $rows[$lineNumber] = $data;
                }
            }

            fclose($handle);
        }

        return $rows;
    }

    private function isValidDateTime(string $dateTime): bool
    {
        try {
            Carbon::createFromFormat('Y-m-d H:i:s', $dateTime);

            return true;
        } catch (\Exception) {
            return false;
        }
    }
}
