<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'zlink' => [
        'url' => env('ZLINK_URL', 'https://zlink-open.minervaiot.com'),
        'app_key' => env('ZLINK_APP_KEY'),
        'app_secret' => env('ZLINK_APP_SECRET'),
        // Fingerprint proxy (Cloudflare Worker). Holds the Zlink admin
        // credentials and exposes an API for on-device fingerprint
        // enrollment and credential status/deletion. Smart HRMS authenticates
        // with proxy_api_key only; the admin credentials stay in the proxy.
        'proxy_url' => env('ZLINK_PROXY_URL'),
        'proxy_api_key' => env('ZLINK_PROXY_API_KEY'),
        'signature_token' => env('ZLINK_SIGNATURE_TOKEN'),
        'encryption_key' => env('ZLINK_ENCRYPTION_KEY'),
        'token_ttl_minutes' => (int) env('ZLINK_TOKEN_TTL_MINUTES', 50),
        'request_timeout' => (int) env('ZLINK_REQUEST_TIMEOUT', 10),
        'page_size' => (int) env('ZLINK_PAGE_SIZE', 200),
        'default_department_id' => env('ZLINK_DEFAULT_DEPARTMENT_ID'),
        'default_device_sn' => env('ZLINK_DEFAULT_DEVICE_SN'),
        // Zlink designation (Job Title) id used for every employee push.
        // Creating an employee requires a `designationId`; on this tenant all
        // SHRMS employees map to the single "Regular" / "Permanent" designation,
        // so it is configured globally rather than per employee.
        'default_designation_id' => env('ZLINK_DEFAULT_DESIGNATION_ID'),
        // Root/parent department UUID under which new departments are created.
        // The department create endpoint requires `parentId`; on this tenant
        // every SHRMS department is a direct child of the company root.
        'portal_root_department_id' => env('ZLINK_PORTAL_ROOT_DEPARTMENT_ID'),
        // ZK SDK / pyzk finger index for remote enrollment (0=left pinky,
        // 3=left index, 4=left thumb, 5=right thumb, 6=right index,
        // …9=right pinky). Right Index (6) is the most common enrollment
        // finger, verified against the Zlink admin UI on 2026-05-03.
        'default_finger_index' => (int) env('ZLINK_DEFAULT_FINGER_INDEX', 6),
    ],

];
