"""Bounded private draft import. No subscriber messages, public assets or logs."""
from datetime import datetime, timezone
from hashlib import sha256
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

ORIGIN = 'https://dainyel-command-center.dainyelr.workers.dev'
ROOT = 'projects/dainyelonthemove/databases/dainyel-content/documents'
ZONE = ZoneInfo('Europe/Amsterdam')
spec = importlib.util.spec_from_file_location('private_requests', Path(__file__).with_name('question-notifications.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)


def require(condition):
    if not condition:
        raise ValueError('Calendar format, state or capacity needs owner review')


def text(value, maximum, required=False):
    require(isinstance(value, str) and len(value) <= maximum and (not required or value.strip()))
    return value.strip()


def validate(plan):
    require(isinstance(plan, dict) and plan.get('version') == 1 and plan.get('timezone') == 'Europe/Amsterdam')
    posts = plan.get('posts')
    require(isinstance(posts, list) and 1 <= len(posts) <= 30)
    rows = {}
    for raw in posts:
        require(isinstance(raw, dict))
        title, caption = text(raw.get('title'), 160, True), text(raw.get('caption'), 5000, True)
        local = raw.get('publishLocal', '')
        require(isinstance(local, str) and re.fullmatch(r'20\d{2}-\d\d-\d\dT\d\d:\d\d', local))
        day = datetime.strptime(local, '%Y-%m-%dT%H:%M').replace(tzinfo=ZONE, fold=1)
        utc = day.astimezone(timezone.utc)
        require(utc.astimezone(ZONE).strftime('%Y-%m-%dT%H:%M') == local)
        design = text(raw.get('designUrl'), 1200, True)
        require(re.fullmatch(r'https://www\.canva\.com/design/[A-Za-z0-9_-]+/edit', design))
        require(raw.get('imageUrl', '') == '' and raw.get('musicUrl', '') == '')
        fields = {
            'version': {'integerValue': '1'}, 'title': {'stringValue': title},
            'caption': {'stringValue': caption}, 'publishAt': {'timestampValue': utc.isoformat().replace('+00:00', 'Z')},
            'timezone': {'stringValue': 'Europe/Amsterdam'}, 'imageUrl': {'stringValue': ''},
            'designUrl': {'stringValue': design}, 'musicUrl': {'stringValue': ''},
            'scheduled': {'booleanValue': False}, 'published': {'booleanValue': False},
            'remindersEnabled': {'booleanValue': True}}
        for key, maximum in (('musicTitle', 160), ('musicArtist', 160), ('musicNote', 800), ('musicSearch', 500)):
            fields[key] = {'stringValue': text(raw.get(key, ''), maximum)}
        ident = 'plan-' + sha256((title + '\n' + local).encode()).hexdigest()[:32]
        require(ident not in rows)
        rows[ident] = fields
    return rows


def import_rows(db, rows):
    existing = db.call(ROOT + ':runQuery', 'POST', {'structuredQuery': {
        'from': [{'collectionId': 'contentCalendar'}],
        'select': {'fields': [{'fieldPath': '__name__'}]}, 'limit': 201}})
    names = {r['document']['name'].rsplit('/', 1)[-1] for r in existing if 'document' in r}
    overlap = set(rows) & names
    if overlap:
        found = db.call(ROOT + ':batchGet', 'POST', {'documents': [ROOT + '/contentCalendar/' + ident for ident in sorted(overlap)]})
        for item in found:
            require('found' in item)
            doc = item['found']
            expected = rows[doc['name'].rsplit('/', 1)[-1]]
            fields = doc['fields']
            for key, value in expected.items():
                if key in ('scheduled', 'published', 'remindersEnabled'):
                    continue
                if key == 'publishAt':
                    require(datetime.fromisoformat(fields[key]['timestampValue'].replace('Z', '+00:00')) == datetime.fromisoformat(value['timestampValue'].replace('Z', '+00:00')))
                else:
                    require(fields.get(key) == value)
    missing = {ident: fields for ident, fields in rows.items() if ident not in names}
    require(len(names) + len(missing) <= 200)
    # Never overwrite owner edits, scheduled/published flags or timestamps.
    if missing:
        writes = [{'update': {'name': ROOT + '/contentCalendar/' + ident, 'fields': fields},
                   'updateTransforms': [{'fieldPath': key, 'setToServerValue': 'REQUEST_TIME'} for key in ('createdAt', 'updatedAt')],
                   'currentDocument': {'exists': False}} for ident, fields in missing.items()]
        db.call(ROOT + ':commit', 'POST', {'writes': writes})
    return len(rows)


def main():
    job = os.environ.get('COMMAND_CENTER_JOB', '')
    require(re.fullmatch(r'[a-f0-9-]{36}', job))
    # The short-lived GitHub identity is scoped to this exact main workflow.
    oidc = helpers.request('GitHub identity', os.environ['ACTIONS_ID_TOKEN_REQUEST_URL'] + '&' + urlencode({'audience': ORIGIN}),
                           {'Authorization': 'Bearer ' + os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN'], 'User-Agent': 'Dainyel-Command-Center'})['value']
    headers = {'Authorization': 'Bearer ' + oidc, 'Content-Type': 'application/json', 'X-Command-Center': '1', 'User-Agent': 'Dainyel-Command-Center'}
    endpoint = ORIGIN + '/api/website-import/' + job
    plan = helpers.request('Command Center', endpoint, headers)['plan']
    count = import_rows(helpers.Firestore(), validate(plan))
    helpers.request('Command Center', endpoint, headers, 'POST', {'imported': count})
    print('Private calendar import confirmed; no public release or email was performed.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Private calendar import not confirmed. Inspect the private dashboard before retrying.', file=sys.stderr)
        sys.exit(1)
