<?php

namespace App\Http\Controllers;

use App\Models\DailyAttendance;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class Export_CSV_Controller extends Controller
{
    private const CHUNK_SIZE = 500;

    private const HEADERS = [
        'Employee ID',
        'Employee Name',
        'Date',
        'Time In',
        'Time Out',
        'Late (min)',
        'Status',
        'Source',
    ];

    public function index(Request $request): StreamedResponse
    {
        $search = trim((string) $request->string('search'));
        $fileName = 'attendance-records-'.now()->format('Y-m-d').'.csv';

        ActivityLogger::logDataExport('attendance', $request);

        $query = DailyAttendance::query()
            ->with('employee:employee_id,name')
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->whereHas('employee', fn ($eq) => $eq->where('name', 'like', '%'.$search.'%'))
                        ->orWhere('date', 'like', '%'.$search.'%')
                        ->orWhere('status', 'like', '%'.$search.'%');
                });
            })
            ->orderByDesc('date')
            ->orderByDesc('id');

        $callback = function () use ($query): void {
            $handle = fopen('php://output', 'w');
            // BOM keeps Excel happy with UTF-8 names.
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, self::HEADERS);

            $query->chunkById(self::CHUNK_SIZE, function ($rows) use ($handle): void {
                foreach ($rows as $record) {
                    fputcsv($handle, [
                        $record->employee_id,
                        $record->employee?->name ?? 'Unknown',
                        $record->date?->format('Y-m-d') ?? '',
                        $record->time_in ?? '',
                        $record->time_out ?? '',
                        (int) ($record->late_minutes ?? 0) > 0 ? (int) $record->late_minutes : '',
                        $record->status,
                        $record->source ?? 'biometric',
                    ]);
                }

                if (function_exists('flush')) {
                    flush();
                }
            });

            fclose($handle);
        };

        return response()->streamDownload(
            $callback,
            $fileName,
            [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
                'X-Accel-Buffering' => 'no',
            ]
        );
    }
}
