---
name: IPCR Target Window Logic
description: How the ipcr_target_open system setting interacts with calendar heuristic for target submission windows
type: project
---

The target submission window uses a two-tier priority system in `IwrController::currentTargetSubmissionPeriod()`:

1. **Force-open (ipcr_target_open = 'true')**: HR explicitly opened a specific semester/year via `notifyIpcrTargetWindow`. This overrides the calendar and allows opening outside Nov/May. Reads `ipcr_target_semester` and `ipcr_target_year` from SystemSettings.

2. **Calendar heuristic (ipcr_target_open = 'false' or default)**: November → Semester 1 open (for next year). May → Semester 2 open (for current year). All other months → closed.

**Key design decision:** `closeIpcrTargetWindow` sets `ipcr_target_open='false'`, which only takes effect OUTSIDE November/May. In November/May the calendar heuristic still opens the window. This is intentional — the spec defines those months as the canonical submission windows.

**System settings involved:**
- `ipcr_target_open` (boolean): seeded as 'false' by migration `2026_04_08_000001`
- `ipcr_target_semester` (integer): 1 or 2
- `ipcr_target_year` (integer): target calendar year

**Why:** SystemSetting::set() uses UPDATE-only (not upsert), so these rows must be seeded by migration before HR can write to them. The migration seeds 'false' as the default so UPDATE finds the row.
