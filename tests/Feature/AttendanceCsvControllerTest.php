<?php

use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\User;
use Illuminate\Http\UploadedFile;

test('hr personnel can export attendance csv', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();
    Employee::query()->create([
        'employee_id' => 'EMP-900',
        'name' => 'Alice Employee',
        'job_title' => 'Analyst',
    ]);
    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-900',
        'date' => '2026-03-07',
        'punch_time' => '2026-03-07 08:00:00',
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
        'period' => 'S1',
        'training_completion_status' => 1,
    ]);

    $this->actingAs($hrUser)
        ->delete(route('admin.historical-data.clear-imported'))
        ->assertRedirect(route('admin.historical-data'));

    expect(HistoricalDataRecord::query()->count())->toBe(0);
});

test('hr personnel can import semestral historical csv data using semester headers', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $csvContent = <<<'CSV'
Employee Name,Department Name,Year,Semester,Attendance_Rate_Pct,Absenteeism Days,Tardiness Incidents,Training Completion Status,Evaluated Performance Score
Alice Employee,Administrative Office,2026,S2,98%,0,1,1,4.6
CSV;

    $file = UploadedFile::fake()->createWithContent('historical-attendance-semester.csv', $csvContent);

    $this->actingAs($hrUser)
        ->post(route('admin.historical-data.import-csv'), [
            'historical_csv' => $file,
        ])
        ->assertRedirect(route('admin.historical-data'));

    $this->assertDatabaseHas('historical_data_records', [
        'employee_name' => 'Alice Employee',
        'department_name' => 'Administrative Office',
        'year' => 2026,
        'quarter' => 'Q3',
        'period' => 'S2',
        'training_completion_status' => 1,
    ]);
});

test('hr personnel can import historical csv files with descriptive semester labels', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    $csvContent = <<<'CSV'
Employee Name,Department Name,Year,Semester,Attendance Rate (%),Absenteeism Days,Tardiness Incidents,Training Completion Status,Evaluated Performance Score
Alice Employee,Administrative Office,2026,1st Semester (Jan - June),98%,0,1,1,4.6
CSV;

    $file = UploadedFile::fake()->createWithContent('historical-attendance-semester-label.csv', $csvContent);

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
        'period' => 'S1',
        'attendance_punctuality_rate' => '98%',
        'training_completion_status' => 1,
    ]);
});
