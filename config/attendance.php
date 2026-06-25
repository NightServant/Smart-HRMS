<?php

return [

    'shift_start' => env('ATTENDANCE_SHIFT_START', '08:00'),

    'grace_period_minutes' => (int) env('ATTENDANCE_GRACE_PERIOD_MINUTES', 0),

    'time_out_min_gap_minutes' => (int) env('ATTENDANCE_TIME_OUT_MIN_GAP_MINUTES', 1),

    'default_source' => env('ATTENDANCE_DEFAULT_SOURCE', 'biometric'),

];
