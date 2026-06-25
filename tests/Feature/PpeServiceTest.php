<?php

use App\Services\PpeService;
use Illuminate\Support\Facades\Process;

test('ppe service normalizes non-finite numeric values from the bridge output', function () {
    Process::fake([
        '*' => Process::result('{"status":"ok","employee_name":"Alice Employee","historical":{"labels":[],"scores":[]},"forecast":{"labels":[],"scores":[]},"trend":"STABLE","recent_avg":NaN,"forecast_avg":Infinity,"coefficients":{"intercept":-Infinity}}'),
    ]);

    $result = app(PpeService::class)->predict('Alice Employee', []);

    expect($result)->toMatchArray([
        'status' => 'ok',
        'employee_name' => 'Alice Employee',
        'trend' => 'STABLE',
        'recent_avg' => null,
        'forecast_avg' => null,
        'coefficients' => [
            'intercept' => null,
        ],
    ]);

    Process::assertRan('node bridge.cjs');
});
