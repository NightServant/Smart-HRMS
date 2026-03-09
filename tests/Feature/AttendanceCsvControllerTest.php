<?php

use App\Models\AttendanceRecord;
use App\Models\HistoricalDataRecord;
use App\Models\User;
use Illuminate\Http\UploadedFile;

test('hr personnel can export attendance csv', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();
    AttendanceRecord::query()->create([
        'name' => 'Alice Employee',
        'date' => '2026-03-07',
        'clock_in' => '08:00 AM',
        'clock_out' => '05:00 PM',
        'status' => 'Present',
    ]);

    $response = $this->actingAs($hrUser)
        ->get(route('admin.attendance-management.export-csv'));

    $response->assertOk();
    $response->assertDownload('attendance-records-'.now()->format('Y-m-d').'.csv');
});

test('hr personnel can import and clear csv from historical data endpoints', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $csvContent = <<<'CSV'
Employee Name,Department Name,Year,Quarter,Attendance_Rate_Pct,Absenteeism Days,Tardiness Incidents,Training Completion Status,Evaluated Performance Score
Alice Employee,Administrative Office,2026,Q1,98%,0,1,1,94
CSV;

    $file = UploadedFile::fake()->createWithContent('historical-attendance.csv', $csvContent);

    $this->actingAs($hrUser)
        ->post(route('admin.historical-data.import-csv'), [
            'historical_csv' => $file,
        ])
        ->assertRedirect(route('admin.historical-data'));

    $this->assertDatabaseHas('historical_data_records', [
        'employee_name' => 'Alice Employee',
        'department_name' => 'Administrative Office',
        'year' => 2026,
        'quarter' => 'Q1',
        'training_completion_status' => 1,
    ]);

    $this->actingAs($hrUser)
        ->delete(route('admin.historical-data.clear-imported'))
        ->assertRedirect(route('admin.historical-data'));

    expect(HistoricalDataRecord::query()->count())->toBe(0);
});
