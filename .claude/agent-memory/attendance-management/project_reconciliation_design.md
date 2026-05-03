---
name: Enrollment reconciliation design decision
description: Why we chose 5-min cache TTL over a scheduled reconciliation command for stale fingerprint detection
type: project
---

**Decision**: `EnrollmentService::verificationStatus` uses a 5-minute confirmation cache (`zlink:enrollment:confirmed:{employee_id}`) instead of the old permanent DB fast-path.

When cache is hot: returns cached result, no Zlink call. When cold: re-validates against Zlink; if Zlink reports no fingerprint and DB says enrolled, clears `fingerprint_enrolled_at` and `fingerprint_finger_index`.

**Why option (a) — live reconciliation — was chosen over option (b) — scheduled command:**
- Deletions in Zlink portal are visible within 5 minutes (next cache expiry + poll tick)
- No separate cron job needed; works even when the scheduler misses a run
- The 3-second enrollment poll already calls this endpoint during active enrollment, so the cache hit rate is very high in normal use
- Option (b) would require a separate `ReconcileFingerprintEnrollment` command and still have a lag of N minutes (the schedule interval)

**Cache keys**: `zlink:enrollment:confirmed:{employee_id}` — TTL 5 min (ENROLLMENT_CONFIRMED_TTL_MINUTES).

**How to apply:** If someone asks to tune how quickly stale enrollment is detected, adjust `ENROLLMENT_CONFIRMED_TTL_MINUTES`. If Zlink calls become expensive, consider increasing it. If immediate detection is needed, set it to 0 (but this kills caching entirely).
