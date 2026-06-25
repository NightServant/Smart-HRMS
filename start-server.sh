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

# Wait for the database to be reachable (up to 60s).
echo "Waiting for database..."
attempts=30
until php artisan db:monitor --databases=mysql 2>/dev/null || [ "$attempts" -le 0 ]; do
    attempts=$((attempts - 1))
    sleep 2
done

php artisan migrate --force
php artisan zlink:secrets:migrate

# One-time historical attendance backfill, gated by a system_settings marker
# (no-op after the first successful run).
php artisan attendance:seed-historical || true

# Reconcile any departments/employees still missing a Zlink mapping. Idempotent
# — existing records are linked, not duplicated. `|| true` so a transient Zlink
# hiccup never blocks boot.
php artisan queue:retry all || true
php artisan zlink:retry-department-sync --all || true
php artisan zlink:retry-employee-sync --all || true

# Build the production caches.
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

php artisan queue:work --daemon --sleep=3 --tries=3 --timeout=60 &
php artisan schedule:work &

php artisan serve --host=0.0.0.0 --port="${PORT:-8080}" --no-reload
