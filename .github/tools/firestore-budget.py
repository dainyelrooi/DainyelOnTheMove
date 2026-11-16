"""Content-free daily quota circuit breaker shared by the existing workflows.

The cache contains only a fixed reason and deadline. It is an optimisation,
never a publication receipt: a missing/invalid cache always probes normally.
"""
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

DAILY_REASONS = {'daily-read-quota', 'daily-write-quota', 'daily-database-quota'}
REASONS = DAILY_REASONS | {'quota-exhausted'}


def quota_reason(payload):
    error = payload.get('error', {}) if isinstance(payload, dict) else {}
    if not isinstance(error, dict):
        return ''
    message = error.get('message', '')
    if error.get('status') != 'RESOURCE_EXHAUSTED' or not isinstance(message, str):
        return ''
    lower = (message + ' ' + json.dumps(error.get('details', []))).lower()
    if 'quota' not in lower:
        return ''
    if not any(word in lower for word in ('daily', 'per day', 'per_day', 'perday')):
        # The service identity can receive only "Quota exceeded." while an
        # owner sees the daily limit. Never guess an all-day hold from that:
        # coalesce further probes for15minutes, then test availability again.
        return '' if any(word in lower for word in ('per minute', 'per_minute', 'perminute', 'per second')) else 'quota-exhausted'
    return 'daily-read-quota' if 'read' in lower else 'daily-write-quota' if 'write' in lower else 'daily-database-quota'


def next_reset(now):
    pacific = ZoneInfo('America/Los_Angeles')
    day = now.astimezone(pacific).date() + timedelta(days=1)
    return datetime.combine(day, datetime.min.time(), pacific).astimezone(timezone.utc) + timedelta(minutes=2)


def state_path():
    value = os.environ.get('FIRESTORE_QUOTA_STATE')
    return Path(value) if value else None


def read_state(now=None):
    now = now or datetime.now(timezone.utc)
    path = state_path()
    try:
        if path is None or not path.is_file() or path.stat().st_size > 512:
            return None
        state = json.loads(path.read_text(encoding='utf-8'))
        until = datetime.fromisoformat(state['until'])
        if set(state) != {'version', 'reason', 'until'} or state['version'] != 1 or state['reason'] not in REASONS or until.tzinfo is None:
            return None
        if now < until <= now + timedelta(hours=26):
            return state
    except (OSError, ValueError, TypeError, KeyError):
        pass
    return None


def record(reason, now=None):
    if reason not in REASONS:
        return 0
    now = now or datetime.now(timezone.utc)
    until = next_reset(now) if reason in DAILY_REASONS else now + timedelta(minutes=15)
    path = state_path()
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({'version': 1, 'reason': reason, 'until': until.isoformat()}), encoding='utf-8')
    output = os.environ.get('GITHUB_OUTPUT')
    if output:
        with open(output, 'a', encoding='utf-8') as handle:
            handle.write('quota_blocked=true\n')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as handle:
            handle.write('\n**BLOCKED — Firestore quota (' + reason + ').** No publication/delivery is confirmed. Next availability probe after ' + until.isoformat() + '. Native Brevo schedules are unchanged.\n')
    return max(1, int((until - now).total_seconds()))


def check():
    state = read_state()
    available = state is None
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as handle:
            handle.write('available=' + str(available).lower() + '\n')
    if state:
        print('BLOCKED: Firestore quota (' + state['reason'] + '); no database/provider action. Retry after ' + state['until'])
        if os.environ.get('GITHUB_STEP_SUMMARY'):
            with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as handle:
                handle.write('\n**BLOCKED — Firestore quota; next availability probe after ' + state['until'] + '.** This run did not publish, send, verify or clear drafts. Native Brevo schedules remain independent.\n')
    elif state_path() and state_path().is_file():
        # Remove only this exact expired/invalid content-free cache file.
        state_path().unlink()
    return available


if __name__ == '__main__':
    check()
