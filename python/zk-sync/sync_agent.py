"""
ZKBio Zlink → Smart HRMS sync agent.

Uses a headless Chromium browser (Playwright) to log into the Zlink portal and
intercept the company-scoped JWT that the portal's switchCompany flow produces.
Then uses that token with requests to fetch paginated attendance transactions and
push them to the Laravel middleware-push endpoint.

Usage:
    python sync_agent.py

Schedule with cron (every 5 minutes):
    */5 * * * * cd /path/to/zk-sync && python sync_agent.py >> sync.log 2>&1
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

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

PAGE_SIZE  = 100
STAMP_FILE = Path(__file__).parent / '.last_sync'


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


def _get_company_token() -> str:
    """
    Drive a headless browser through the Zlink login flow.
    Intercept the company-scoped JWT returned by the switchCompany endpoint.
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
        page.wait_for_timeout(2000)

        browser.close()

    if not captured:
        _log('ERROR: Could not capture company token — switchCompany was not called.')
        sys.exit(1)

    _log('Company-scoped token obtained.')
    return captured[0]


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
    return datetime.now() - timedelta(hours=24)


def _save_last_sync(dt: datetime) -> None:
    STAMP_FILE.write_text(dt.isoformat())


def sync() -> None:
    _validate_config()

    last_sync = _load_last_sync()
    now       = datetime.now()

    token = _get_company_token()

    _log(f"Fetching transactions from {last_sync.strftime('%Y-%m-%d %H:%M:%S')} → {now.strftime('%Y-%m-%d %H:%M:%S')}")
    transactions = _fetch_transactions(token, last_sync, now)
    _log(f"Total: {len(transactions)} transaction(s).")

    if not transactions:
        _save_last_sync(now)
        return

    records = [
        {'pin': t['personPin'], 'datetime': t['eventTime']}
        for t in transactions
        if t.get('personPin') and t.get('eventTime')
    ]

    _log(f"Pushing {len(records)} record(s) to Laravel ...")

    try:
        resp = requests.post(
            f'{LARAVEL_URL}/api/iclock/middleware-push',
            json={'serialNumber': ZLINK_DEVICE_SN, 'records': records},
            headers={'Authorization': f'Bearer {ZK_API_KEY}'},
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        _log(f"Success — server queued {result.get('count', '?')} record(s).")
    except requests.HTTPError as e:
        _log(f"ERROR: HTTP {e.response.status_code} — {e.response.text[:200]}")
        sys.exit(1)
    except requests.RequestException as e:
        _log(f"ERROR: Could not reach Laravel API — {e}")
        sys.exit(1)

    _save_last_sync(now)
    _log(f"Done. Stamp saved: {now.isoformat()}")


if __name__ == '__main__':
    sync()
