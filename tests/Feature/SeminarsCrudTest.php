<?php

use App\Jobs\NotifyAllEmployeesTrainingJob;
use App\Models\Notification;
use App\Models\Seminars;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

function createVerifiedHrUser(): User
{
    return User::factory()->asHrPersonnel()->create([
        'name' => 'Test User',
        'email_verified_at' => now(),
    ]);
}

test('training scheduling page is displayed', function () {
    $user = createVerifiedHrUser();

    $response = $this
        ->actingAs($user)
        ->get(route('admin.training-scheduling'));

    $response->assertOk();
});

test('seminar can be created', function () {
    $user = createVerifiedHrUser();

    $response = $this
        ->actingAs($user)
        ->post(route('seminars.store'), [
            'title' => 'Data Analysis Training',
            'description' => 'Seminar for data-driven HR decisions',
            'location' => 'Conference Room A',
            'time' => '09:30',
            'speaker' => 'Jane Doe',
            'target_performance_area' => 'Decision Making',
            'date' => '2026-03-10',
        ]);

    $response->assertRedirect(route('admin.training-scheduling'));

    $this->assertDatabaseHas('seminars', [
        'title' => 'Data Analysis Training',
        'speaker' => 'Jane Doe',
    ]);
});

test('seminar can be updated', function () {
    $user = createVerifiedHrUser();
    $seminar = Seminars::query()->create([
        'title' => 'Initial Seminar',
        'description' => 'Initial description',
        'location' => 'Room 1',
        'time' => '08:00',
        'speaker' => 'John Smith',
        'target_performance_area' => 'Communication',
        'date' => '2026-03-01',
    ]);

    $response = $this
        ->actingAs($user)
        ->put(route('seminars.update', $seminar), [
            'title' => 'Updated Seminar',
            'description' => 'Updated description',
            'location' => 'Room 2',
            'time' => '10:00',
            'speaker' => 'John Smith',
            'target_performance_area' => 'Leadership',
            'date' => '2026-03-02',
        ]);

    $response->assertRedirect(route('admin.training-scheduling'));

    $this->assertDatabaseHas('seminars', [
        'id' => $seminar->id,
        'title' => 'Updated Seminar',
        'location' => 'Room 2',
    ]);
});

test('seminar can be deleted', function () {
    $user = createVerifiedHrUser();
    $seminar = Seminars::query()->create([
        'title' => 'Delete Me',
        'description' => 'Delete description',
        'location' => 'Room 3',
        'time' => '13:00',
        'speaker' => 'Alex Roe',
        'target_performance_area' => 'Teamwork',
        'date' => '2026-03-05',
    ]);

    $response = $this
        ->actingAs($user)
        ->delete(route('seminars.destroy', $seminar));

    $response->assertRedirect(route('admin.training-scheduling'));

    $this->assertDatabaseMissing('seminars', [
        'id' => $seminar->id,
    ]);
});

test('notify-all training endpoint dispatches the queued job', function () {
    Queue::fake();

    $this->actingAs(createVerifiedHrUser())
        ->post(route('admin.training-suggestions.notify-all'))
        ->assertRedirect();

    Queue::assertPushed(NotifyAllEmployeesTrainingJob::class, 1);
});

test('notify-all job creates one notification per employee and skips duplicates', function () {
    $employees = User::factory()->count(3)->create(['role' => User::ROLE_EMPLOYEE]);
    User::factory()->asHrPersonnel()->create();
    User::factory()->asEvaluator()->create();

    (new NotifyAllEmployeesTrainingJob)->handle();

    expect(Notification::query()->where('type', NotifyAllEmployeesTrainingJob::NOTIFICATION_TYPE)->count())
        ->toBe(3);

    foreach ($employees as $employee) {
        $this->assertDatabaseHas('notifications', [
            'user_id' => $employee->id,
            'type' => NotifyAllEmployeesTrainingJob::NOTIFICATION_TYPE,
            'is_important' => true,
        ]);
    }

    (new NotifyAllEmployeesTrainingJob)->handle();

    expect(Notification::query()->where('type', NotifyAllEmployeesTrainingJob::NOTIFICATION_TYPE)->count())
        ->toBe(3);
});

test('notify-all endpoint requires hr-personnel role', function () {
    $employee = User::factory()->create(['role' => User::ROLE_EMPLOYEE]);

    $this->actingAs($employee)
        ->post(route('admin.training-suggestions.notify-all'))
        ->assertForbidden();
});
