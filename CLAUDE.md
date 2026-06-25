# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart HRMS is a Laravel 12 + React 19 application (Inertia.js v2) for human resource management. It includes four Python-based AI modules for workflow routing, performance prediction, training recommendations, and real-time scoring.

## Development Commands

```bash
# Start all services (Laravel server, queue, log tail, Vite)
composer run dev

# Initial setup (install deps, migrate, build)
composer run setup

# Frontend only
npm run dev          # Vite dev server
npm run build        # Production build
npm run types        # TypeScript type check
npm run lint         # ESLint with auto-fix
npm run format       # Prettier (resources/)

# Backend
composer run lint    # PHP formatting (Pint)
composer run test    # Full suite: lint check + tests

# Run specific tests
php artisan test --compact --filter=TestName

# Format PHP after changes
vendor/bin/pint --dirty --format agent
```

The app is served by Laravel Herd at `https://smart-hrms.test` — do not run commands to make it available via HTTP.

## Architecture

### Frontend-Backend Connection
- **Inertia.js v2** bridges Laravel controllers and React pages — no separate API layer for UI
- **Wayfinder** auto-generates TypeScript route functions in `resources/js/routes/` and `resources/js/actions/` from Laravel routes
- Pages live in `resources/js/pages/`, components in `resources/js/components/`
- UI built with Radix UI primitives, Tailwind CSS v4, and shadcn-style patterns (clsx + tailwind-merge + class-variance-authority)

### Python AI Modules (`python/`)
Four modules use an identical pattern: Laravel Service → `Process::run('node bridge.cjs')` → Python runner via stdin/stdout JSON:

| Module | Service | Purpose |
|--------|---------|---------|
| `python/iwr/` | `IwrService` | Routes leave requests and IPCR forms to reviewers |
| `python/ppe/` | `PpeService` | Predicts employee performance trends |
| `python/atre/` | `AtreService` | Recommends training based on competency gaps |
| `python/rt-hr-dashboard/` | `FlatFatService` | Real-time performance scoring |

Each module has its own `.venv`. The JSON protocol is `{"action": "...", "payload": {...}}` in, `{"status": "success|error", "data": {...}}` out, with a 30-second timeout.

### Authorization
Four roles checked via `role:` middleware: `administrator`, `employee`, `evaluator`, `hr-personnel`. Role is a column on the `users` table (not Spatie policies).

### Key Route Groups
- Employee routes: `/dashboard`, `/leave-application`, `/attendance`, `/submit-evaluation`
- Evaluator routes: `/performanceDashboard`, `/evaluation-page`, `/document-management`, `/admin/leave-management`
- HR Personnel routes: `/admin/hr-leave-management`, `/admin/attendance-management`, `/admin/historical-data`, `/training-scheduling`
- System Admin routes: `/admin/system-dashboard`, `/admin/user-management`, `/admin/system-settings`, `/admin/audit-logs`, `/admin/reports`
- API routes: `/api/flatfat/*` (real-time dashboard), `/api/predict` (PPE), `/api/iclock/*` (biometric device ADMS)

## Code Conventions

### PHP
- PHP 8 constructor property promotion required
- Explicit return type declarations on all methods
- Curly braces for all control structures
- Enum keys in TitleCase
- PHPDoc blocks over inline comments
- Use `Model::query()` instead of `DB::` facade; eager load to prevent N+1
- Use Form Request classes for validation, not inline
- Use `config()` helper, never `env()` outside config files
- Run `vendor/bin/pint --dirty --format agent` after modifying PHP files

### Frontend
- TypeScript strict mode; Prettier with 4-space indent, single quotes, 80-char width
- Import Wayfinder routes from `@/actions/` (controllers) or `@/routes/` (named routes)
- Use `useForm()` from `@inertiajs/react` for form handling

### Testing
- Pest v4 framework; most tests should be feature tests
- Create tests with `php artisan make:test --pest {name}` (add `--unit` for unit tests)
- Use model factories; check for existing factory states before manually setting up models
- Every change should be tested

### Laravel 12 Specifics
- Middleware configured in `bootstrap/app.php`, not a Kernel class
- Console commands in `app/Console/Commands/` auto-discovered
- Column modifications in migrations must re-specify all existing attributes
- Model casts use a `casts()` method, not `$casts` property — follow existing model conventions
