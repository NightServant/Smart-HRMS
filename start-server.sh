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

# Wait for MySQL to be reachable
echo "Waiting for database..."
attempts=30
until php artisan db:monitor --databases=mysql 2>/dev/null || [ "$attempts" -le 0 ]; do
    attempts=$((attempts - 1))
    sleep 2
done

php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
