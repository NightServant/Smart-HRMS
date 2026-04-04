<?php

use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\HistoricalDataRecord;
use App\Models\IpcrSubmission;
use App\Models\User;

test('attendance metrics returns expanded dashboard payload', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    Employee::query()->create([
        'employee_id' => 'EMP-100',
        'name' => 'Alpha Employee',
        'job_title' => 'Analyst',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-101',
        'name' => 'Bravo Employee',
        'job_title' => 'Officer',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-102',
        'name' => 'Charlie Employee',
        'job_title' => 'Assistant',
    ]);

    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-100',
        'date' => now()->toDateString(),
        'punch_time' => now()->setTime(8, 0),
        'status' => 'Present',
    ]);
    AttendanceRecord::query()->create([
        'employee_id' => 'EMP-101',
        'date' => now()->toDateString(),
        'punch_time' => now()->setTime(8, 15),
        'status' => 'Late',
    ]);

    $this->actingAs($hrUser)
        ->getJson(route('api.flatfat.attendance-metrics'))
        ->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.total_employees', 3)
        ->assertJsonPath('data.employees_with_record_today', 2)
        ->assertJsonPath('data.absent_count', 1);
});

test('semester scores endpoint filters semestral records and normalizes historical scores', function () {
    $evaluator = User::factory()->asEvaluator()->create();

    HistoricalDataRecord::query()->create([
        'employee_name' => 'Alpha Employee',
        'department_name' => 'Administrative Office',
        'year' => 2026,
        'quarter' => 'Q1',
        'period' => null,
        'attendance_punctuality_rate' => '98%',
        'absenteeism_days' => 0,
        'tardiness_incidents' => 1,
        'training_completion_status' => 1,
        'evaluated_performance_score' => 90,
    ]);
    HistoricalDataRecord::query()->create([
        'employee_name' => 'Bravo Employee',
        'department_name' => 'Administrative Office',
        'year' => 2026,
        'quarter' => 'Q2',
        'period' => 'S1',
        'attendance_punctuality_rate' => '87%',
        'absenteeism_days' => 3,
        'tardiness_incidents' => 2,
        'training_completion_status' => 1,
        'evaluated_performance_score' => 40,
    ]);
    HistoricalDataRecord::query()->create([
        'employee_name' => 'Alpha Employee',
        'department_name' => 'Administrative Office',
        'year' => 2026,
        'quarter' => 'Q3',
        'period' => 'S2',
        'attendance_punctuality_rate' => '93%',
        'absenteeism_days' => 1,
        'tardiness_incidents' => 1,
        'training_completion_status' => 1,
        'evaluated_performance_score' => 80,
    ]);
    HistoricalDataRecord::query()->create([
        'employee_name' => 'Charlie Employee',
        'department_name' => 'Administrative Office',
        'year' => 2025,
        'quarter' => 'Q4',
        'period' => null,
        'attendance_punctuality_rate' => '83%',
        'absenteeism_days' => 2,
        'tardiness_incidents' => 2,
        'training_completion_status' => 1,
        'evaluated_performance_score' => 60,
    ]);

    $this->actingAs($evaluator)
        ->getJson(route('api.flatfat.semester-scores', ['year' => 2026, 'period' => 'S1']))
        ->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.year', 2026)
        ->assertJsonPath('data.period', 'S1')
        ->assertJsonPath('data.available_years.0', 2026)
        ->assertJsonPath('data.available_years.1', 2025)
        ->assertJsonPath('data.aggregate.total_employees', 2)
        ->assertJsonPath('data.aggregate.high_risk_count', 1)
        ->assertJsonPath('data.aggregate.satisfactory_count', 1)
        ->assertJsonPath('data.average_rating', 3.25)
        ->assertJsonPath('data.employee_scores.0.employee_name', 'Alpha Employee')
        ->assertJsonPath('data.employee_scores.0.final_rating', 4.5)
        ->assertJsonPath('data.employee_scores.1.employee_name', 'Bravo Employee')
        ->assertJsonPath('data.employee_scores.1.final_rating', 2);
});

test('evaluation risk summary uses the latest rated submission per employee', function () {
    $hrUser = User::factory()->asHrPersonnel()->create();

    Employee::query()->create([
        'employee_id' => 'EMP-201',
        'name' => 'Alpha Employee',
        'job_title' => 'Analyst',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-202',
        'name' => 'Bravo Employee',
        'job_title' => 'Officer',
    ]);
    Employee::query()->create([
        'employee_id' => 'EMP-203',
        'name' => 'Charlie Employee',
        'job_title' => 'Assistant',
    ]);

    IpcrSubmission::query()->create([
        'employee_id' => 'EMP-201',
        'performance_rating' => 2.00,
    ]);
    IpcrSubmission::query()->create([
        'employee_id' => 'EMP-201',
        'performance_rating' => 3.50,
    ]);
    IpcrSubmission::query()->create([
        'employee_id' => 'EMP-202',
        'performance_rating' => 2.40,
    ]);
    IpcrSubmission::query()->create([
        'employee_id' => 'EMP-203',
        'performance_rating' => null,
    ]);

    $this->actingAs($hrUser)
        ->getJson(route('api.flatfat.evaluation-risk-summary'))
        ->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.total_employees', 2)
        ->assertJsonPath('data.high_risk_count', 1)
        ->assertJsonPath('data.satisfactory_count', 1)
        ->assertJsonPath('data.high_risk_percentage', 50)
        ->assertJsonPath('data.average_rating', 2.95);
});
