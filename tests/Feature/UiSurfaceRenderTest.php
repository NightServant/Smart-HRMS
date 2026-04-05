<?php

use App\Models\SystemSetting;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('homepage can be rendered with registration state', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->has('canRegister'));
});

test('employee surfaces render expected inertia components', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('recommendations'));

    $this->actingAs($user)
        ->get(route('leave-application'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('leave-application')
            ->has('leaveHistory'));

    $this->actingAs($user)
        ->get(route('attendance'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('attendance')
            ->has('records')
            ->has('employeeId'));

    $this->actingAs($user)
        ->get(route('submit-evaluation'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'employee')
            ->has('currentPeriod')
            ->has('latestSubmission'));

    $this->actingAs($user)
        ->get(route('ipcr.form'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('ipcr-form')
            ->has('draftFormPayload')
            ->has('latestSubmission'));
});

test('evaluator, hr, pmt, and admin entry surfaces render expected components', function () {
    $evaluator = User::factory()->asEvaluator()->create();
    $hr = User::factory()->asHrPersonnel()->create();
    $pmt = User::factory()->asPmt()->create();
    $admin = User::factory()->asAdministrator()->create();

    $this->actingAs($evaluator)
        ->get(route('performanceDashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('performanceDashboard')
            ->has('remarks')
            ->has('leaveOverview'));

    $this->actingAs($hr)
        ->get(route('admin.performance-dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/performance-dashboard')
            ->has('remarks')
            ->has('leaveOverview'));

    $this->actingAs($hr)
        ->get(route('admin.hr-review'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'hr')
            ->has('hrPanel.reviewQueue'));

    $this->actingAs($hr)
        ->get(route('admin.hr-finalize'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'hr')
            ->has('hrPanel.finalizationQueue'));

    $this->actingAs($pmt)
        ->get(route('admin.pmt-review'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('performance-evaluation')
            ->where('roleView', 'pmt')
            ->has('pmtPanel.submissions'));

    $this->actingAs($admin)
        ->get(route('admin.system-dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/system-performance-dashboard')
            ->has('accountMetrics'));
});

test('auth, settings, and maintenance support screens render expected components', function () {
    $user = User::factory()->create();

    $this->get(route('login'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->has('accountProfile'));

    SystemSetting::query()->create([
        'key' => 'maintenance_mode',
        'value' => '1',
        'type' => 'boolean',
        'group' => 'general',
        'label' => 'Maintenance mode',
    ]);

    SystemSetting::query()->create([
        'key' => 'maintenance_message',
        'value' => 'Scheduled platform maintenance in progress.',
        'type' => 'string',
        'group' => 'general',
        'label' => 'Maintenance message',
    ]);

    $this->actingAs($user)
        ->get(route('maintenance'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('maintenance')
            ->where('message', 'Scheduled platform maintenance in progress.'));
});
