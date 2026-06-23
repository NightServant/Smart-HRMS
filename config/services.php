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
        // Fingerprint proxy (Cloudflare Worker). Holds the Zlink portal
        // credentials and exposes a clean API for on-device fingerprint
        // enrollment + credential status/deletion. Smart HRMS authenticates
        // with proxy_api_key only — it never holds the Zlink portal login.
        'proxy_url' => env('ZLINK_PROXY_URL'),
        'proxy_api_key' => env('ZLINK_PROXY_API_KEY'),
        'signature_token' => env('ZLINK_SIGNATURE_TOKEN'),
        'encryption_key' => env('ZLINK_ENCRYPTION_KEY'),
        'token_ttl_minutes' => (int) env('ZLINK_TOKEN_TTL_MINUTES', 50),
        'request_timeout' => (int) env('ZLINK_REQUEST_TIMEOUT', 10),
        'page_size' => (int) env('ZLINK_PAGE_SIZE', 200),
        'default_department_id' => env('ZLINK_DEFAULT_DEPARTMENT_ID'),
        'default_device_sn' => env('ZLINK_DEFAULT_DEVICE_SN'),
        // Zlink portal designation (Job Title) id used for every employee push.
        // The portal SPA's "Add Person" form requires `designationId`; on this
        // tenant all SHRMS employees map to the single "Regular" / "Permanent"
        // designation, so this is configured globally rather than per employee.
        'default_designation_id' => env('ZLINK_DEFAULT_DESIGNATION_ID'),
        // Root/parent department UUID under which new departments are created.
        // The portal's `org/dept/create` endpoint requires `parentId`; on this
        // tenant every SHRMS department is a direct child of the company root.
        'portal_root_department_id' => env('ZLINK_PORTAL_ROOT_DEPARTMENT_ID'),
        // ZK SDK / pyzk finger index for remote enrollment (0=left pinky,
        // 3=left index, 4=left thumb, 5=right thumb, 6=right index,
        // …9=right pinky). Right Index (6) is the most common enrollment
        // finger and confirmed against the Zlink portal UI on 2026-05-03.
        'default_finger_index' => (int) env('ZLINK_DEFAULT_FINGER_INDEX', 6),

        // Customer admin portal (zlink.minervaiot.com). Used for the unpublished
        // remote-registration trigger that the open API doesn't expose. Credentials
        // are an Owner/Admin login on the Zlink web portal.
        'portal_url' => env('ZLINK_PORTAL_URL', 'https://zlink.minervaiot.com'),
        'portal_username' => env('ZLINK_PORTAL_USERNAME'),
        'portal_password' => env('ZLINK_PORTAL_PASSWORD'),
        'portal_device_id' => env('ZLINK_PORTAL_DEVICE_ID'),
        'portal_company_id' => env('ZLINK_PORTAL_COMPANY_ID'),
        'portal_token_ttl_minutes' => (int) env('ZLINK_PORTAL_TOKEN_TTL_MINUTES', 55),

        // Browser-fingerprint headers required by the portal SPA.
        'portal_device_unique_id' => env('ZLINK_PORTAL_DEVICE_UNIQUE_ID', '00000000-0000-4000-8000-000000000001'),
        'portal_timezone' => env('ZLINK_PORTAL_TIMEZONE', 'Asia/Manila;dst=0;UTC=+08:00;'),

        // Debugging escape hatch. Paste a Bearer token captured from the Zlink
        // SPA DevTools to skip the login chain and isolate whether 401s come
        // from auth or from the request headers.
        'portal_bearer_override' => env('ZLINK_PORTAL_BEARER_OVERRIDE'),
    ],

];
