<?php

namespace App\Http\Controllers;

use App\Imports\HistoricalDataRecordsImport;
use App\Models\HistoricalDataRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class Import_CSV_Controller extends Controller
{
    public function storeHistorical(Request $request): RedirectResponse
    {
        $this->importHistoricalCsv($request);

        return to_route('admin.historical-data')->with('success', 'Historical CSV imported successfully.');
    }

    public function clearHistoricalImported(): RedirectResponse
    {
        HistoricalDataRecord::query()->delete();

        return to_route('admin.historical-data')->with('success', 'Imported historical records were cleared.');
    }

    private function importHistoricalCsv(Request $request): void
    {
        $validated = $request->validate([
            'historical_csv' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        Excel::import(new HistoricalDataRecordsImport, $validated['historical_csv']);
    }
}
