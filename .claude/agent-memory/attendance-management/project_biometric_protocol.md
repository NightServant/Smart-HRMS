---
name: Zlink biometric integration protocol
description: Key facts about the Zlink open API + portal integration: auth flow, enrollment, attendance pull, confirmed error codes
type: project
---

**Zlink open API base**: `https://zlink-open.minervaiot.com` — all paths under `/open-apis/`.

**Auth**: POST `/open-apis/authen/v1/tenantToken/internal` with `appKey`/`appSecret`. Returns `data.tenantToken`. Cached 50 min. 401 triggers refresh.

**Attendance pull**: `POST /open-apis/att/v1/transactions/search`. Body: `startDateTime`, `endDateTime` in `Y-m-d H:i:s` format, plus `pageNumber`/`pageSize`. Response: `data.list[]` where each row has `employeeCode` and `checkTime`. Confirmed via direct probing 2026-05-03 — `startTime`/`endTime` etc. all reject. ZCOP1020/ZCOP1021 errors are non-deterministic and do not reliably indicate which field is wrong. Endpoint requires `att/v1` permission granted to the app key in the Zlink developer portal — without it returns `ZKBC0004 "No permission, please authorize and then use this feature"` (with HTTP 200, not 4xx).

**Employee map**: `employeeCode` in Zlink → `employees.zkteco_pin` locally → `employee_id`.

**Enrollment trigger**: open-API `/open-apis/biometric/v1/remote-enroll` 404s on this tenant. Falls back to portal `dcc/device/remoteRegistration`. `fid` param uses ZK SDK / pyzk convention: 0=left pinky, 1=left ring, 2=left middle, 3=left index, 4=left thumb, 5=right thumb, 6=right index, 7=right middle, 8=right ring, 9=right pinky. Confirmed 2026-05-03 against the portal UI — sending fid=9 lit up the Right Pinky slot. Default is 6 (Right Index) via `ZLINK_DEFAULT_FINGER_INDEX` config. Note: this is the OPPOSITE of the legacy "0=right thumb" convention previously in this memo.

**Enrollment detection**: `data.fingerprintVersionMap[deviceSn].fingerIndex` in portal response is the actual finger index enrolled. `data.num` is retry count (not finger index).

**Portal auth**: login → switchCompany → company-scoped JWT. Must set `Source: pc` header + JWT as both Bearer header and `Authorization` cookie or get ZKBC0004.

**Attendance records dedup**: unique index on `(employee_id, punch_time)`. `insertOrIgnore` is idempotent.

**Why:** Documented to avoid re-discovering these facts.

**How to apply:** When touching any Zlink API call or attendance ingestion code.
