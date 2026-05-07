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

# Wait for database to be reachable (up to 60 seconds)
echo "Waiting for database..."
attempts=30
until php artisan db:monitor --databases=mysql 2>/dev/null || [ "$attempts" -le 0 ]; do
    attempts=$((attempts - 1))
    sleep 2
done

php artisan migrate --force
php artisan zlink:secrets:migrate

# Retry any failed jobs from prior deploys before backfilling — old failed
# jobs picked up the old code path (e.g. open-API createDepartment that 405s)
# and benefit from running on the new portal-API path.
php artisan queue:retry all || true

# Re-queue every department that lacks a Zlink mapping. Must run BEFORE the
# employee backfill so that employees in those departments find their dept
# id already populated and avoid the cascading create-on-the-fly chain.
# Idempotent — DepartmentSyncService finds existing portal departments by
# name via treeNode and just links the local row.
php artisan zlink:retry-department-sync --all || true

# Re-queue every employee that lacks a Zlink mapping. Covers records created
# in earlier releases where the sync wiring didn't exist, where the open-API
# path 405'd, or where the dispatch landed in failed_jobs. Idempotent: the
# duplicate-detect branch in EmployeeSyncService backfills zlink_employee_id
# from Zlink without creating ghosts. `|| true` so a transient Zlink hiccup
# doesn't block container boot.
php artisan zlink:retry-employee-sync --all || true

php artisan config:cache
php artisan route:cache
php artisan view:cache

php artisan queue:work --daemon --sleep=3 --tries=3 --timeout=60 &
php artisan schedule:work &

php artisan serve --host=0.0.0.0 --port="${PORT:-8080}" --no-reload
