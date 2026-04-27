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
        'signature_token' => env('ZLINK_SIGNATURE_TOKEN'),
        'encryption_key' => env('ZLINK_ENCRYPTION_KEY'),
        'token_ttl_minutes' => (int) env('ZLINK_TOKEN_TTL_MINUTES', 50),
        'request_timeout' => (int) env('ZLINK_REQUEST_TIMEOUT', 10),
        'page_size' => (int) env('ZLINK_PAGE_SIZE', 200),
        'default_department_id' => env('ZLINK_DEFAULT_DEPARTMENT_ID'),
    ],

];
