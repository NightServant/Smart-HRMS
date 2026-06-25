#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY is required."
    exit 1
fi

php artisan queue:work --sleep=1 --tries=3 --timeout=120 --verbose
