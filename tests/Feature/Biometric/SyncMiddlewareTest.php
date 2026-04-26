<?php

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();

    config([
        'services.zkbiotime.url' => 'https://zkbio.test',
        'services.zkbiotime.username' => 'admin',
        'services.zkbiotime.password' => 'admin',
        'services.zkbiotime.auth_mode' => 'jwt',
        'services.zkbiotime.default_terminal_sn' => 'TERM-A',
    ]);

    Http::fake([
        'https://zkbio.test/jwt-api-token-auth/' => Http::response(['token' => 'tok'], 200),
        'https://zkbio.test/iclock/api/transactions/*' => Http::response(['data' => [], 'next' => null], 200),
    ]);

    Employee::query()->create([
        'employee_id' => 'EMP-MW-1',
        'name' => 'MW User',
        'job_title' => 'Clerk',
    ]);
});

test('hitting /attendance sets the sync cooldown cache key', function () {
    $user = User::factory()->create([
        'employee_id' => 'EMP-MW-1',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $this->actingAs($user)->get('/attendance')->assertOk();

    expect(Cache::has('biometric:sync:last-run'))->toBeTrue();
});

test('subsequent /attendance hit within the cooldown does not refresh the key', function () {
    $user = User::factory()->create([
        'employee_id' => 'EMP-MW-1',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $this->actingAs($user)->get('/attendance')->assertOk();
    $firstStamp = Cache::get('biometric:sync:last-run');

    $this->actingAs($user)->get('/attendance')->assertOk();
    $secondStamp = Cache::get('biometric:sync:last-run');

    expect($secondStamp)->toBe($firstStamp);
});

test('Inertia partial reloads do not trigger sync cooldown', function () {
    $user = User::factory()->create([
        'employee_id' => 'EMP-MW-1',
        'role' => User::ROLE_EMPLOYEE,
    ]);

    $this->actingAs($user)
        ->withHeaders(['X-Inertia-Partial-Component' => 'attendance'])
        ->get('/attendance');

    expect(Cache::has('biometric:sync:last-run'))->toBeFalse();
});
