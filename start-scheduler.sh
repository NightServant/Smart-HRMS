#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY is required."
    exit 1
fi

while true
do
    php artisan schedule:run --no-interaction --verbose
    sleep 60
done
