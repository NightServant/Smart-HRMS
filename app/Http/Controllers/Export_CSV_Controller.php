<?php

namespace App\Http\Controllers;

use App\Exports\AttendanceRecordsExport;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Maatwebsite\Excel\Excel;
use Maatwebsite\Excel\Facades\Excel as ExcelFacade;

class Export_CSV_Controller extends Controller
{
    public function index(Request $request): BinaryFileResponse
    {
        $search = trim((string) $request->string('search'));
        $fileName = 'attendance-records-'.now()->format('Y-m-d').'.csv';

        ActivityLogger::logDataExport('attendance', $request);

        return ExcelFacade::download(new AttendanceRecordsExport($search), $fileName, Excel::CSV);
    }
}
