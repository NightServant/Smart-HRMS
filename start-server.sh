#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY is required."
    exit 1
fi

mkdir -p \
    bootstrap/cache \
    storage/app/private \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs

if [ ! -L public/storage ] && [ ! -e public/storage ]; then
    php artisan storage:link >/dev/null 2>&1 || true
fi

php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
