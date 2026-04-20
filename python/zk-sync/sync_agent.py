"""
ZKBio Zlink → Smart HRMS sync agent.

Uses a headless Chromium browser (Playwright) to log into the Zlink portal and
intercept the company-scoped JWT that the portal's switchCompany flow produces.
Then uses that token with requests to fetch paginated attendance transactions and
push them to the Laravel middleware-push endpoint.

Modes:
    python sync_agent.py            # run once and exit
    python sync_agent.py --daemon   # loop forever, syncing every SYNC_INTERVAL seconds

The token is cached in memory and renewed ~5 minutes before it expires, so the
browser is only launched once per hour rather than on every poll.

Run as a permanent daemon via launchd (see com.shrms.zksync.plist).
"""

import json
import os
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

ZLINK_BASE      = 'https://zlink.minervaiot.com/zlink-api/v1.0'
ZLINK_USERNAME  = os.getenv('ZLINK_USERNAME', '')
ZLINK_PASSWORD  = os.getenv('ZLINK_PASSWORD', '')
ZLINK_DEVICE_ID = os.getenv('ZLINK_DEVICE_ID', '')
ZLINK_DEVICE_SN = os.getenv('ZLINK_DEVICE_SN', '')
LARAVEL_URL     = os.getenv('LARAVEL_URL', '').rstrip('/')
ZK_API_KEY      = os.getenv('ZK_API_KEY', '')

DEVICE_TZ     = ZoneInfo('Asia/Manila')
PAGE_SIZE     = 100
STAMP_FILE    = Path(__file__).parent / '.last_sync'
SYNC_INTERVAL = int(os.getenv('SYNC_INTERVAL', '2'))   # seconds between polls in daemon mode
TOKEN_RENEW_BUFFER = 300                                  # renew token 5 min before expiry

_shutdown = False


def _request_shutdown(signum, frame) -> None:
    global _shutdown
    _shutdown = True
    _log(f"Received signal {signum} — finishing current poll and exiting.")


def _device_now() -> datetime:
    """Current time in the device's timezone (Asia/Manila), naive for API payload."""
    return datetime.now(DEVICE_TZ).replace(tzinfo=None)


def _log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def _validate_config() -> None:
    missing = [k for k, v in {
        'ZLINK_USERNAME':  ZLINK_USERNAME,
        'ZLINK_PASSWORD':  ZLINK_PASSWORD,
        'ZLINK_DEVICE_ID': ZLINK_DEVICE_ID,
        'ZLINK_DEVICE_SN': ZLINK_DEVICE_SN,
        'LARAVEL_URL':     LARAVEL_URL,
        'ZK_API_KEY':      ZK_API_KEY,
    }.items() if not v]

    if missing:
        _log(f"ERROR: Missing env vars: {', '.join(missing)}")
        sys.exit(1)


def _token_expiry(token: str) -> datetime:
    """Decode the JWT expiry claim (no signature verification needed)."""
    import base64
    try:
        payload = token.split('.')[1]
        payload += '=' * (4 - len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
        return datetime.fromtimestamp(claims["exp"], tz=timezone.utc).replace(tzinfo=None)
    except Exception:
        return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=55)


def _get_company_token() -> tuple[str, datetime]:
    """
    Drive a headless browser through the Zlink login flow.
    Intercept the company-scoped JWT returned by the switchCompany endpoint.
    Returns (token, expiry_utc).
    """
    captured: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
            ),
            locale='en-US',
            timezone_id='Asia/Manila',
        )
        page = context.new_page()

        def _on_response(response) -> None:
            if 'switchCompany' in response.url and response.status == 200:
                try:
                    body = json.loads(response.text())
                    token = (body.get('data') or {}).get('access_token')
                    if token:
                        captured.clear()
                        captured.append(token)
                except Exception:
                    pass

        page.on('response', _on_response)

        _log('Opening Zlink portal ...')
        page.goto('https://zlink.minervaiot.com/login', wait_until='networkidle', timeout=30000)

        # Dismiss "Mobile App Upgrade Notification" modal if present
        confirm_btn = page.locator('button:has-text("Confirm")')
        if confirm_btn.is_visible():
            confirm_btn.click()
            page.wait_for_timeout(500)

        page.locator('input[placeholder="Email"]').fill(ZLINK_USERNAME)
        page.locator('input[type="password"]').fill(ZLINK_PASSWORD)

        # Agree to terms (required or Sign In is blocked)
        agreement = page.locator('input[name="agreement"]')
        if not agreement.is_checked():
            agreement.check()
            page.wait_for_timeout(200)

        _log('Submitting login ...')
        page.locator('button:has-text("Sign In")').click()

        # Wait for post-login redirect and all background API calls to complete
        page.wait_for_url(lambda url: 'login' not in url.lower(), timeout=20000)
        page.wait_for_load_state('networkidle', timeout=15000)
        page.wait_for_timeout(500)

        browser.close()

    if not captured:
        _log('ERROR: Could not capture company token — switchCompany was not called.')
        sys.exit(1)

    token  = captured[0]
    expiry = _token_expiry(token)
    _log(f"Company-scoped token obtained (expires ~{expiry.strftime('%H:%M')} UTC).")
    return token, expiry


def _api_headers(token: str) -> dict:
    return {
        'Authorization':    f'Bearer {token}',
        'x-csrf-token':     token,
        'source':           'pc',
        'current-timezone': 'Asia/Manila;dst=0;UTC=+08:00;',
        'device-uniqueid':  'c6baf6f9-bd1c-069d-799d-6bdd5006dcfb',
        'Content-Type':     'application/json',
    }


def _fetch_transactions(token: str, start: datetime, end: datetime) -> list[dict]:
    records = []
    page    = 1

    while True:
        payload = {
            'pageNumber':    page,
            'pageSize':      PAGE_SIZE,
            'deviceIds':     [ZLINK_DEVICE_ID],
            'deviceType':    'att',
            'startDateTime': start.strftime('%Y-%m-%d %H:%M:%S'),
            'endDateTime':   end.strftime('%Y-%m-%d %H:%M:%S'),
            'eventTime':     [start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d')],
            'operator':      None,
        }

        resp = requests.post(
            f'{ZLINK_BASE}/zlink/dcc/transaction',
            json=payload,
            headers=_api_headers(token),
            timeout=30,
        )

        if not resp.ok:
            _log(f"ERROR: Transaction page {page}: {resp.status_code} {resp.text[:200]}")
            resp.raise_for_status()

        data        = resp.json().get('data') or {}
        page_list   = data.get('list') or []
        total_pages = int(data.get('totalPages') or data.get('totalPage') or 1)

        records.extend(page_list)
        _log(f"  Page {page}/{total_pages}: {len(page_list)} records")

        if page >= total_pages or not page_list:
            break
        page += 1

    return records


def _load_last_sync() -> datetime:
    if STAMP_FILE.exists():
        try:
            return datetime.fromisoformat(STAMP_FILE.read_text().strip())
        except ValueError:
            pass
    return _device_now() - timedelta(hours=24)


def _save_last_sync(dt: datetime) -> None:
    STAMP_FILE.write_text(dt.isoformat())


def _push(token: str, last_sync: datetime, now: datetime) -> None:
    """Fetch transactions and push to Laravel. Cursor only advances on success.
    Raises on hard errors so the daemon loop can retry the same window next tick.
    """
    transactions = _fetch_transactions(token, last_sync, now)

    if not transactions:
        _log(f"⚠ No new records (window {last_sync.strftime('%H:%M:%S')} → {now.strftime('%H:%M:%S')} Asia/Manila)")
        _save_last_sync(now)
        return

    records = [
        {'pin': t['personPin'], 'datetime': t['eventTime']}
        for t in transactions
        if t.get('personPin') and t.get('eventTime')
    ]

    if not records:
        _log(f"⚠ {len(transactions)} transaction(s) fetched but none had usable pin+eventTime.")
        _save_last_sync(now)
        return

    resp = requests.post(
        f'{LARAVEL_URL}/api/iclock/middleware-push',
        json={'serialNumber': ZLINK_DEVICE_SN, 'records': records},
        headers={'Authorization': f'Bearer {ZK_API_KEY}'},
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    _log(f"✔ {result.get('count', len(records))} new record(s) synced — last sync: {now.strftime('%Y-%m-%d %H:%M:%S')} Asia/Manila")
    _save_last_sync(now)


def sync() -> None:
    """Run once: authenticate, fetch, push, exit."""
    _validate_config()
    last_sync    = _load_last_sync()
    now          = _device_now()
    token, _     = _get_company_token()
    _log(f"Fetching {last_sync.strftime('%Y-%m-%d %H:%M:%S')} → {now.strftime('%Y-%m-%d %H:%M:%S')} Asia/Manila")
    try:
        _push(token, last_sync, now)
    except requests.HTTPError as e:
        _log(f"❌ HTTP {e.response.status_code} — {e.response.text[:200]}")
        sys.exit(1)
    except requests.RequestException as e:
        _log(f"❌ {e}")
        sys.exit(1)
    _log('Done.')


def daemon() -> None:
    """Loop forever: reuse the token, re-authenticate before expiry."""
    _validate_config()
    signal.signal(signal.SIGINT, _request_shutdown)
    signal.signal(signal.SIGTERM, _request_shutdown)
    _log(f"Daemon started — polling every {SYNC_INTERVAL}s (device TZ: Asia/Manila).")

    token: str            = ''
    token_expiry: datetime = datetime.now(timezone.utc).replace(tzinfo=None)

    while not _shutdown:
        try:
            # Re-authenticate if token is missing or about to expire
            if not token or datetime.now(timezone.utc).replace(tzinfo=None) >= token_expiry - timedelta(seconds=TOKEN_RENEW_BUFFER):
                _log('Authenticating with Zlink ...')
                token, token_expiry = _get_company_token()

            last_sync = _load_last_sync()
            now       = _device_now()

            try:
                _push(token, last_sync, now)
            except requests.HTTPError as e:
                status = e.response.status_code
                _log(f"❌ HTTP {status} from Laravel — {e.response.text[:120]} (cursor not advanced, will retry)")
                if status == 401:
                    token = ''
            except requests.RequestException as e:
                _log(f"❌ Network error: {e} (cursor not advanced, will retry)")

        except Exception as e:
            _log(f"❌ Unexpected error: {e} — retrying in {SYNC_INTERVAL}s")

        # Interruptible sleep so SIGTERM shuts down within 1s, not 30s
        for _ in range(SYNC_INTERVAL):
            if _shutdown:
                break
            time.sleep(1)

    _log('Daemon stopped.')


if __name__ == '__main__':
    if '--daemon' in sys.argv:
        daemon()
    else:
        sync()
