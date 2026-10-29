#!/usr/bin/env python3
"""Export complete, already-public content only; never write to Firestore.

The default check is entirely offline. Sync uses the existing IAM helper and
pins every public query and explicitly linked media read to one readTime.
Failures do not replace the last complete local copy or authorize deployment.
"""
import argparse
import base64
import binascii
from datetime import datetime, timezone, timedelta
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import struct
import sys
import urllib.error
import urllib.request
import uuid

spec = importlib.util.spec_from_file_location('public_snapshot_helpers', Path(__file__).with_name('question-notifications.py'))
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
ROOT = helpers.ROOT
DATABASE = f'projects/{helpers.PROJECT}/databases/{helpers.DATABASE}'
OUTPUT_ROOT = Path(__file__).resolve().parents[2]
DOMAINS = {'qa': 'qa.json', 'cms': 'cms.json', 'website': 'website.json'}
PAGE_SIZE, MAX_PAGES, MAX_ROWS, MAX_CALLS = 40, 25, 500, 400
MAX_JSON_BYTES, MAX_IMAGE_BYTES, MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024, 144000, 32 * 1024 * 1024
MAX_REST_BYTES, MAX_CDN_BYTES = 8 * 1024 * 1024, 16 * 1024 * 1024
CDN_HOSTS = {'staging': 'https://dainyelonthemove-staging.web.app', 'production': 'https://dainyelonthemove.com'}
ENVELOPE = {'version', 'complete', 'space', 'generation', 'generatedAt'}
CMS_FIELDS = {'version', 'kind', 'title', 'excerpt', 'body', 'place', 'sources', 'videoUrl', 'photoIds',
              'photoPlacements', 'heroPhotoId', 'heroLayout', 'heroPosition', 'storyLabel', 'tripPeriod'}
CMS_REQUIRED = {'version', 'kind', 'title', 'excerpt', 'body', 'place', 'sources', 'videoUrl', 'photoIds', 'publishedAt', 'updatedAt'}
PUBLIC_DATES = {'createdAt', 'answeredAt', 'publishedAt', 'updatedAt'}
PHOTO_FIELDS = {'version', 'entryId', 'sectionId', 'dataUrl', 'alt', 'width', 'height'}
ENTRY_ID = re.compile(r'entry-[a-f0-9]{32}\Z')
PHOTO_ID = re.compile(r'photo-[a-f0-9]{32}\Z')
PLAIN_ID = re.compile(r'[A-Za-z0-9_-]{1,80}\Z')
SECTION_ID = re.compile(r'[a-z][a-z0-9-]{0,70}-[a-f0-9]{16}\Z')
IMAGE_SRC = re.compile(r'/assets/public-content/([a-f0-9]{64})\.webp\Z')
PAGES = {'index', 'about', 'stories', 'videos', 'collaborate', 'my-kit', 'atlas', 'qa', 'thailand',
         'thailand-solo', 'bali', 'philippines', 'shared'}


class SnapshotError(RuntimeError):
    """Fixed safe errors only: never include documents, credentials or content."""


def require(condition, message='Public content validation failed'):
    if not condition:
        raise SnapshotError(message)


def stamp(value):
    require(isinstance(value, str), 'Invalid public timestamp')
    match = re.fullmatch(r'(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z', value)
    require(match is not None, 'Invalid public timestamp')
    try:
        seconds = datetime.strptime(match[1], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone.utc)
    except ValueError:
        raise SnapshotError('Invalid public timestamp') from None
    return seconds, (match[2] or '').ljust(9, '0')


def text(value, maximum, minimum=0):
    require(isinstance(value, str) and minimum <= len(value) <= maximum)
    return value


def integer(value, low, high):
    require(type(value) is int and low <= value <= high)
    return value


def unpack(value):
    require(isinstance(value, dict) and len(value) == 1, 'Unexpected public field type')
    key, raw = next(iter(value.items()))
    if key in {'stringValue', 'timestampValue'}:
        require(isinstance(raw, str)); return raw
    if key == 'booleanValue':
        require(type(raw) is bool); return raw
    if key == 'integerValue':
        require(isinstance(raw, str) and re.fullmatch(r'-?\d{1,16}', raw)); return int(raw)
    if key == 'arrayValue':
        require(isinstance(raw, dict) and set(raw) <= {'values'})
        values = raw.get('values', [])
        require(isinstance(values, list) and len(values) <= MAX_ROWS)
        return [unpack(item) for item in values]
    if key == 'mapValue':
        require(isinstance(raw, dict) and set(raw) <= {'fields'})
        fields = raw.get('fields', {})
        require(isinstance(fields, dict) and len(fields) <= 40)
        return {name: unpack(item) for name, item in fields.items()}
    raise SnapshotError('Unexpected public field type')


def fields(document, allowed):
    require(isinstance(document, dict) and isinstance(document.get('fields'), dict), 'Invalid public document')
    # Never decode or copy unknown/private fields, even in a public document.
    return {name: unpack(document['fields'][name]) for name in allowed if name in document['fields']}


def ids(values):
    require(isinstance(values, list) and len(values) <= 12 and all(isinstance(v, str) and PHOTO_ID.fullmatch(v) for v in values))
    require(len(set(values)) == len(values))
    return list(values)


def bounded_request(url, headers, method='GET', body=None, *, maximum, missing_ok=False):
    """Bound bytes before JSON/image parsing; never follow a redirect."""
    require(type(maximum) is int and maximum > 0, 'Public response byte bound reached')
    request = urllib.request.Request(url, method=method, headers=headers,
        data=None if body is None else json.dumps(body, separators=(',', ':')).encode())
    try:
        with urllib.request.build_opener(helpers.NoRedirect()).open(request, timeout=30) as response:
            length = response.headers.get('Content-Length')
            require(length is None or length.isdecimal() and int(length) <= maximum, 'Public response byte bound reached')
            raw = response.read(maximum + 1)
            require(len(raw) <= maximum, 'Public response byte bound reached')
            return raw
    except urllib.error.HTTPError as error:
        status = error.code
        error.close()
        if missing_ok and status == 404: return None
        raise SnapshotError('Public read unavailable; no response body logged') from None
    except (OSError, ValueError):
        raise SnapshotError('Public read unavailable; no response body logged') from None


class Store(helpers.Firestore):
    def __init__(self):
        super().__init__()
        self.response_bytes = 0

    def call(self, path, method='GET', body=None):
        # This worker has no database write or email operation, including check.
        require(method == 'GET' and path == DATABASE or
                method == 'POST' and path.startswith(ROOT) and path.endswith((':runQuery', ':batchGet')),
                'Read-only snapshot operation refused')
        remaining = MAX_REST_BYTES - self.response_bytes
        raw = bounded_request('https://firestore.googleapis.com/v1/' + path, self.headers, method, body, maximum=remaining)
        self.response_bytes += len(raw)
        return json.loads(raw)


class Reader:
    def __init__(self, store):
        self.store, self.read_time, self.calls = store, None, 0
        self.response_bytes = 0

    def call(self, path, body):
        self.calls += 1
        require(self.calls <= MAX_CALLS, 'Public snapshot read bound reached')
        result = self.store.call(path, 'POST', body)
        self.response_bytes += len(json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode())
        require(self.response_bytes <= MAX_REST_BYTES, 'Public response byte bound reached')
        return result

    def pin(self):
        # Probe only a public ID. Discard it; actual content is reread at the
        # captured server time so probe streaming cannot mix generations.
        rows = self.call(ROOT + ':runQuery', {'structuredQuery': {
            'select': {'fields': [{'fieldPath': '__name__'}]}, 'from': [{'collectionId': 'questions'}],
            'where': {'fieldFilter': {'field': {'fieldPath': 'status'}, 'op': 'EQUAL', 'value': {'stringValue': 'published'}}},
            'limit': 1}})
        require(isinstance(rows, list) and 0 < len(rows) <= 3, 'Snapshot server time unavailable')
        times = [row.get('readTime') for row in rows if isinstance(row, dict)]
        require(len(times) == len(rows), 'Snapshot server time unavailable')
        for value in times: stamp(value)
        self.read_time = max(times, key=stamp)
        return self.read_time

    def query(self, parent, collection, names, *, published=False):
        require(self.read_time is not None, 'Snapshot read time is missing')
        base = parent + '/' + collection + '/'
        result, cursor = [], None
        for _ in range(MAX_PAGES):
            query = {'select': {'fields': [{'fieldPath': name} for name in sorted(names)]},
                     'from': [{'collectionId': collection}], 'orderBy': [{'field': {'fieldPath': '__name__'}, 'direction': 'ASCENDING'}],
                     'limit': PAGE_SIZE}
            if published:
                query['where'] = {'fieldFilter': {'field': {'fieldPath': 'status'}, 'op': 'EQUAL', 'value': {'stringValue': 'published'}}}
            if cursor:
                query['startAt'] = {'values': [{'referenceValue': cursor}], 'before': False}
            rows = self.call(parent + ':runQuery', {'structuredQuery': query, 'readTime': self.read_time})
            require(isinstance(rows, list) and 0 < len(rows) <= PAGE_SIZE + 2, 'Incomplete public query response')
            page = []
            for row in rows:
                require(isinstance(row, dict) and 'error' not in row and stamp(row.get('readTime')) == stamp(self.read_time), 'Inconsistent public read time')
                require(not row.get('skippedResults'), 'Partial public query refused')
                if 'document' not in row:
                    require(set(row) <= {'readTime', 'skippedResults'}, 'Incomplete public query response'); continue
                document = row['document']; require(isinstance(document, dict), 'Invalid public document')
                name = document.get('name', '')
                require(isinstance(name, str) and name.startswith(base) and '/' not in name[len(base):] and PLAIN_ID.fullmatch(name[len(base):]), 'Unexpected public document path')
                require((cursor is None or name > cursor) and (not page or name > page[-1]['name']), 'Public pagination made no progress')
                page.append(document)
            require(len(page) <= PAGE_SIZE, 'Public query bound exceeded')
            result.extend(page)
            require(len(result) <= MAX_ROWS, 'Public snapshot row bound reached')
            if len(page) < PAGE_SIZE:
                return result
            cursor = page[-1]['name']
        raise SnapshotError('Public pagination did not complete')

    def media(self, path):
        rows = self.call(ROOT + ':batchGet', {'documents': [path], 'mask': {'fieldPaths': sorted(PHOTO_FIELDS)}, 'readTime': self.read_time})
        require(isinstance(rows, list) and len(rows) == 1, 'Incomplete public media response')
        row = rows[0]
        require(isinstance(row, dict) and stamp(row.get('readTime')) == stamp(self.read_time), 'Inconsistent public media read time')
        require('missing' not in row and row.get('found', {}).get('name') == path, 'Linked public photograph unavailable')
        return fields(row['found'], PHOTO_FIELDS)


def webp_dimensions(raw):
    """Validate a static metadata-free WebP container and coded dimensions.

    This validates the RIFF/chunk/header contract without adding a decoder. It
    does not claim a full entropy/image-decoding test for untrusted bytes.
    """
    require(isinstance(raw, bytes) and 20 <= len(raw) <= MAX_IMAGE_BYTES, 'Invalid public WebP')
    require(raw[:4] == b'RIFF' and raw[8:12] == b'WEBP' and struct.unpack('<I', raw[4:8])[0] + 8 == len(raw), 'Invalid public WebP')
    position, canvas, coded, saw_alpha = 12, None, None, False
    while position < len(raw):
        require(position + 8 <= len(raw), 'Invalid public WebP')
        kind, size = raw[position:position + 4], struct.unpack('<I', raw[position + 4:position + 8])[0]
        end = position + 8 + size
        require(end + (size & 1) <= len(raw), 'Invalid public WebP')
        payload = raw[position + 8:end]
        if kind == b'VP8X':
            require(canvas is None and coded is None and position == 12 and size == 10 and payload[0] & ~0x10 == 0 and payload[1:4] == b'\0\0\0', 'Unsupported public WebP metadata')
            canvas = (1 + int.from_bytes(payload[4:7], 'little'), 1 + int.from_bytes(payload[7:10], 'little'))
        elif kind == b'ALPH':
            require(canvas is not None and coded is None and not saw_alpha and size > 0, 'Invalid public WebP')
            saw_alpha = True
        elif kind == b'VP8 ':
            require(coded is None and size >= 10 and payload[0] & 1 == 0 and payload[3:6] == b'\x9d\x01\x2a', 'Invalid public WebP')
            coded = (int.from_bytes(payload[6:8], 'little') & 0x3fff, int.from_bytes(payload[8:10], 'little') & 0x3fff)
        elif kind == b'VP8L':
            require(coded is None and not saw_alpha and size >= 5 and payload[0] == 0x2f and payload[4] & 0xe0 == 0, 'Invalid public WebP')
            bits = int.from_bytes(payload[1:5], 'little'); coded = ((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
        else:
            raise SnapshotError('Unsupported public WebP metadata')
        position = end + (size & 1)
    require(position == len(raw) and coded is not None and (canvas is None or canvas == coded), 'Invalid public WebP')
    require(all(0 < n <= 1600 for n in coded), 'Public photograph dimensions exceeded')
    return coded


def photo(data, identifier, owner_key, owner, images):
    require(data.get('version') == 1 and type(data.get('version')) is int and data.get(owner_key) == owner, 'Public photograph ownership mismatch')
    data_url = text(data.get('dataUrl'), 192000, 1)
    require(data_url.startswith('data:image/webp;base64,'), 'Invalid public image encoding')
    encoded = data_url[len('data:image/webp;base64,'):]
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise SnapshotError('Invalid public image encoding') from None
    require(base64.b64encode(raw).decode('ascii') == encoded, 'Invalid public image encoding')
    width, height = integer(data.get('width'), 1, 1600), integer(data.get('height'), 1, 1600)
    require(webp_dimensions(raw) == (width, height), 'Public image dimensions disagree')
    digest = hashlib.sha256(raw).hexdigest()
    images[digest] = raw
    require(sum(map(len, images.values())) <= MAX_TOTAL_IMAGE_BYTES, 'Public image export bound reached')
    return {'id': identifier, 'src': '/assets/public-content/' + digest + '.webp', 'alt': text(data.get('alt'), 180, 1), 'width': width, 'height': height}


def date_fields(data, names, read_time):
    for name in names:
        require(stamp(data.get(name)) <= stamp(read_time), 'Future public timestamp refused')
    return {name: data[name] for name in names}


def build_snapshot(store, space, *, generation=None):
    require(space in {'staging', 'production'}, 'Unexpected snapshot namespace')
    reader = Reader(store); read_time = reader.pin()
    generation = generation or uuid.uuid4().hex
    require(isinstance(generation, str) and re.fullmatch(r'[a-f0-9]{16,64}', generation), 'Invalid public generation')
    envelope = {'version': 1, 'complete': True, 'space': space, 'generation': generation, 'generatedAt': read_time}
    questions, threads, entries, sections, images = [], [], [], [], {}
    qa_names = {'status', 'publicationConsent', 'topic', 'question', 'answer', 'createdAt', 'answeredAt'}
    for document in reader.query(ROOT, 'questions', qa_names, published=True):
        data = fields(document, qa_names)
        if data.get('status') != 'published' or data.get('publicationConsent') is not True: continue
        questions.append({'id': document['name'].split('/')[-1], 'status': 'published', 'publicationConsent': True,
                          'topic': text(data.get('topic'), 80, 1), 'question': text(data.get('question'), 1000, 10),
                          'answer': text(data.get('answer'), 3000, 1), **date_fields(data, ['createdAt', 'answeredAt'], read_time)})
    thread_names = {'status', 'publicationConsent', 'displayName', 'topic', 'question', 'createdAt'}
    reply_names = {'status', 'publicationConsent', 'displayName', 'message', 'createdAt'}
    for document in reader.query(ROOT, 'communityThreads', thread_names, published=True):
        data = fields(document, thread_names)
        if data.get('status') != 'published' or data.get('publicationConsent') is not True: continue
        replies = []
        for reply in reader.query(document['name'], 'replies', reply_names, published=True):
            item = fields(reply, reply_names)
            if item.get('status') != 'published' or item.get('publicationConsent') is not True: continue
            replies.append({'id': reply['name'].split('/')[-1], 'status': 'published', 'displayName': text(item.get('displayName'), 40, 2),
                            'message': text(item.get('message'), 1000, 10), **date_fields(item, ['createdAt'], read_time)})
        threads.append({'id': document['name'].split('/')[-1], 'status': 'published', 'topic': text(data.get('topic'), 80, 1),
                        'question': text(data.get('question'), 1000, 10), 'displayName': text(data.get('displayName'), 40, 2),
                        **date_fields(data, ['createdAt'], read_time), 'replies': replies})
    for document in reader.query(ROOT + '/cmsSpaces/' + space, 'published', CMS_FIELDS | PUBLIC_DATES | {'status'}):
        data = fields(document, CMS_FIELDS | PUBLIC_DATES | {'status'})
        if data.get('status', 'published') != 'published': continue
        identifier = document['name'].split('/')[-1]
        require(ENTRY_ID.fullmatch(identifier) and CMS_REQUIRED <= set(data) and type(data.get('version')) is int and data['version'] == 1)
        require(data.get('kind') in {'blog', 'field-note', 'fact'})
        for key, low, high in [('title', 1, 140), ('excerpt', 10, 320), ('body', 10, 60000), ('place', 0, 100), ('sources', 0, 3000), ('videoUrl', 0, 500)]: text(data.get(key), high, low)
        require(not data['videoUrl'] or re.fullmatch(r'https://(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)/[^\s]+', data['videoUrl']))
        photo_ids = ids(data['photoIds'])
        data = {**data, 'heroPhotoId': data.get('heroPhotoId', photo_ids[0] if photo_ids else ''), 'heroLayout': data.get('heroLayout', 'split'),
                'heroPosition': data.get('heroPosition', 'center'), 'storyLabel': data.get('storyLabel', ''), 'tripPeriod': data.get('tripPeriod', ''),
                'photoPlacements': data.get('photoPlacements', [0] * len(photo_ids))}
        require(data['heroLayout'] in {'split', 'wide'} and data['heroPosition'] in {'top', 'center', 'bottom'} and (data['heroPhotoId'] == '' or data['heroPhotoId'] in photo_ids))
        text(data['storyLabel'], 120); text(data['tripPeriod'], 80)
        require(isinstance(data['photoPlacements'], list) and len(data['photoPlacements']) == len(photo_ids))
        for value in data['photoPlacements']: integer(value, -1, 24)
        photos = [photo(reader.media(ROOT + '/cmsSpaces/' + space + '/media/' + pid), pid, 'entryId', identifier, images) for pid in photo_ids]
        entries.append({'id': identifier, **{key: data[key] for key in CMS_FIELDS}, **date_fields(data, ['publishedAt', 'updatedAt'], read_time), 'photos': photos})
    for document in reader.query(ROOT + '/websiteSpaces/' + space, 'published', {'version', 'pageId', 'values', 'photoIds', 'status'}):
        data = fields(document, {'version', 'pageId', 'values', 'photoIds', 'status'})
        if data.get('status', 'published') != 'published': continue
        identifier, page = document['name'].split('/')[-1], data.get('pageId')
        require(SECTION_ID.fullmatch(identifier) and isinstance(page, str) and len(page) <= 71 and (page in PAGES or re.fullmatch(r'note-[a-z0-9-]+', page)) and re.fullmatch(re.escape(page) + r'-[a-f0-9]{16}', identifier))
        require(type(data.get('version')) is int and data['version'] == 1 and isinstance(data.get('values'), dict) and len(data['values']) <= 24)
        values = data['values']
        require(all(re.fullmatch(r'f(?:0\d|1\d|2[0-3])', key) and isinstance(value, str) and len(value) <= 8000 for key, value in values.items()))
        photo_ids = ids(data.get('photoIds'))
        media = [dict(photo(reader.media(ROOT + '/websiteSpaces/' + space + '/media/' + pid), pid, 'sectionId', identifier, images), sectionId=identifier) for pid in photo_ids]
        sections.append({'id': identifier, 'pageId': page, 'values': values, 'photoIds': photo_ids, 'media': media})
    summaries = [{'id': entry['id'], **{key: entry[key] for key in ['version', 'kind', 'title', 'excerpt', 'place', 'publishedAt', 'updatedAt']},
                  'coverPhotoId': entry['photoIds'][0] if entry['photoIds'] else '', 'coverPhoto': entry['photos'][0] if entry['photos'] else None} for entry in entries]
    documents = {'manifest.json': {**envelope, 'domains': DOMAINS}, 'qa.json': {**envelope, 'questions': questions, 'threads': threads},
                 'cms.json': {**envelope, 'entries': entries, 'summaries': summaries}, 'website.json': {**envelope, 'sections': sections}}
    encoded = {name: (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode() for name, value in documents.items()}
    require(all(len(raw) <= (16384 if name == 'manifest.json' else MAX_JSON_BYTES) for name, raw in encoded.items()), 'Public JSON export bound reached')
    return {'documents': documents, 'encoded': encoded, 'images': images, 'readTime': read_time, 'calls': reader.calls}


def target(root, relative):
    root = Path(root).resolve()
    path = root / relative
    require(path.resolve().is_relative_to(root), 'Snapshot output escaped its root')
    for node in [path, *path.parents]:
        if node == root: break
        require(not node.is_symlink(), 'Symlink snapshot output refused')
    return path


def install_snapshot(bundle, output_root):
    """Manifest-last local replacement, rolling back caught I/O failures.

    The workflow must deploy only after success. A process kill or failing disk
    can interrupt local multi-file replacement; generation validation rejects
    mixed files. No previous CDN copy or old image is deleted by this worker.
    """
    root = Path(output_root).resolve(); root.mkdir(parents=True, exist_ok=True)
    staging = target(root, '.public-snapshot-' + uuid.uuid4().hex); staging.mkdir()
    previous, installed = {}, []
    try:
        changes = []
        for digest, raw in sorted(bundle['images'].items()):
            require(re.fullmatch(r'[a-f0-9]{64}', digest) and hashlib.sha256(raw).hexdigest() == digest, 'Invalid assembled public image')
            path = target(root, 'assets/public-content/' + digest + '.webp')
            if path.exists(): require(path.read_bytes() == raw, 'Existing public image hash mismatch')
            else: changes.append((path, raw))
        for name in ['qa.json', 'cms.json', 'website.json', 'manifest.json']:
            changes.append((target(root, 'data/public-content/' + name), bundle['encoded'][name]))
        # Assemble every file first. Nothing public changes on validation or
        # staging-write failure, and the completeness pointer is replaced last.
        for index, (path, raw) in enumerate(changes):
            previous[path] = path.read_bytes() if path.exists() else None
            (staging / str(index)).write_bytes(raw)
        for index, (path, raw) in enumerate(changes):
            require((path.read_bytes() if path.exists() else None) == previous[path], 'Concurrent local snapshot change')
            path.parent.mkdir(parents=True, exist_ok=True)
            os.replace(staging / str(index), path); installed.append((path, raw))
    except BaseException:
        rollback_failed = False
        for index, (path, expected) in enumerate(reversed(installed)):
            try:
                require(path.read_bytes() == expected, 'Concurrent local snapshot change')
                old = previous[path]
                if old is None: path.unlink()
                else:
                    recovery = staging / ('restore-' + str(index)); recovery.write_bytes(old); os.replace(recovery, path)
            except Exception: rollback_failed = True
        if rollback_failed: raise SnapshotError('Local snapshot recovery incomplete; deployment must not proceed') from None
        raise
    finally:
        # Flat, exact owned temporary files only; no recursive delete or purge.
        for path in staging.iterdir():
            require(path.is_file() and not path.is_symlink(), 'Unexpected snapshot temporary path')
            path.unlink()
        staging.rmdir()


def check_local_snapshot(output_root, space, *, now=None):
    require(space in {'production', 'staging'}, 'Unexpected snapshot namespace')
    path = target(output_root, 'data/public-content/manifest.json')
    if not path.exists():
        require(not any(target(output_root, 'data/public-content/' + name).exists() for name in DOMAINS.values()), 'Partial local snapshot has no manifest')
        return {'status': 'NOT_AVAILABLE', 'space': space}
    def read(name, maximum):
        raw = target(output_root, 'data/public-content/' + name).read_bytes()
        require(len(raw) <= maximum, 'Public JSON export bound reached')
        value = json.loads(raw); require(isinstance(value, dict)); return value
    def read_image(src):
        return target(output_root, src.lstrip('/')).read_bytes()
    return validate_copy(read, read_image, space, now=now)


def validate_manifest(manifest, space, now):
    require(space in {'production', 'staging'}, 'Unexpected snapshot namespace')
    require(isinstance(manifest, dict) and set(manifest) == ENVELOPE | {'domains'} and type(manifest.get('version')) is int and manifest['version'] == 1 and manifest.get('complete') is True and manifest.get('space') == space and manifest.get('domains') == DOMAINS)
    require(isinstance(manifest.get('generation'), str) and re.fullmatch(r'[a-f0-9]{16,64}', manifest['generation']))
    captured = stamp(manifest.get('generatedAt'))[0]
    require(captured <= now + timedelta(minutes=5), 'Future local snapshot refused')
    return captured


def validate_copy(read, read_image, space, *, now=None):
    """The same strict schema/hash check serves local and retained CDN copies."""
    manifest = read('manifest.json', 16384)
    now = now or datetime.now(timezone.utc)
    captured = validate_manifest(manifest, space, now)
    for domain, name in DOMAINS.items():
        value = read(name, MAX_JSON_BYTES)
        require(all(value.get(key) == manifest[key] for key in ENVELOPE), 'Mixed or incomplete local snapshot')
        names = {'qa': {'questions', 'threads'}, 'cms': {'entries', 'summaries'}, 'website': {'sections'}}[domain]
        require(set(value) == ENVELOPE | names)
        for key in names: require(isinstance(value[key], list) and len(value[key]) <= MAX_ROWS)
        allowed = {
            'questions': {'id', 'status', 'publicationConsent', 'topic', 'question', 'answer', 'createdAt', 'answeredAt'},
            'threads': {'id', 'status', 'topic', 'question', 'displayName', 'createdAt', 'replies'},
            'entries': CMS_FIELDS | {'id', 'publishedAt', 'updatedAt', 'photos'},
            'summaries': {'id', 'version', 'kind', 'title', 'excerpt', 'place', 'coverPhotoId', 'coverPhoto', 'publishedAt', 'updatedAt'},
            'sections': {'id', 'pageId', 'values', 'photoIds', 'media'}}
        for key in names:
            for item in value[key]:
                require(isinstance(item, dict) and set(item) == allowed[key], 'Non-public snapshot fields refused')
                require(isinstance(item.get('id'), str) and PLAIN_ID.fullmatch(item['id']))
                if key in {'questions', 'threads'}: require(item['status'] == 'published')
                if key == 'questions': require(item['publicationConsent'] is True)
                if key in {'questions', 'threads'}:
                    text(item['topic'], 80, 1); text(item['question'], 1000, 10)
                    date_fields(item, ['createdAt', 'answeredAt'] if key == 'questions' else ['createdAt'], manifest['generatedAt'])
                if key == 'questions': text(item['answer'], 3000, 1)
                if key == 'threads':
                    text(item['displayName'], 40, 2)
                    require(isinstance(item['replies'], list) and len(item['replies']) <= MAX_ROWS)
                    for reply in item['replies']:
                        require(isinstance(reply, dict) and set(reply) == {'id', 'status', 'displayName', 'message', 'createdAt'} and reply['status'] == 'published')
                        require(isinstance(reply['id'], str) and PLAIN_ID.fullmatch(reply['id']))
                        text(reply['displayName'], 40, 2); text(reply['message'], 1000, 10); date_fields(reply, ['createdAt'], manifest['generatedAt'])
                if key in {'entries', 'summaries'}:
                    require(ENTRY_ID.fullmatch(item['id']) and type(item['version']) is int and item['version'] == 1 and item['kind'] in {'blog', 'field-note', 'fact'})
                    text(item['title'], 140, 1); text(item['excerpt'], 320, 10); text(item['place'], 100)
                    date_fields(item, ['publishedAt', 'updatedAt'], manifest['generatedAt'])
                if key == 'entries':
                    text(item['body'], 60000, 10); text(item['sources'], 3000); text(item['videoUrl'], 500)
                    require(not item['videoUrl'] or re.fullmatch(r'https://(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)/[^\s]+', item['videoUrl']))
                    photo_ids = ids(item['photoIds'])
                    require(item['heroLayout'] in {'split', 'wide'} and item['heroPosition'] in {'top', 'center', 'bottom'} and (item['heroPhotoId'] == '' or item['heroPhotoId'] in photo_ids))
                    text(item['storyLabel'], 120); text(item['tripPeriod'], 80)
                    require(isinstance(item['photoPlacements'], list) and len(item['photoPlacements']) == len(photo_ids))
                    for placement in item['photoPlacements']: integer(placement, -1, 24)
                    require(isinstance(item['photos'], list) and [image.get('id') for image in item['photos']] == photo_ids)
                if key == 'sections':
                    page = text(item['pageId'], 71, 1)
                    require((page in PAGES or re.fullmatch(r'note-[a-z0-9-]+', page)) and re.fullmatch(re.escape(page) + r'-[a-f0-9]{16}', item['id']))
                    require(isinstance(item['values'], dict) and len(item['values']) <= 24)
                    require(all(re.fullmatch(r'f(?:0\d|1\d|2[0-3])', field) and isinstance(content, str) and len(content) <= 8000 for field, content in item['values'].items()))
                    photo_ids = ids(item['photoIds'])
                    require(isinstance(item['media'], list) and [image.get('id') for image in item['media']] == photo_ids)
                photos = item.get('photos', item.get('media', [item.get('coverPhoto')] if item.get('coverPhoto') else []))
                require(isinstance(photos, list) and len(photos) <= 12)
                for image in photos:
                    required = {'id', 'src', 'alt', 'width', 'height'} | ({'sectionId'} if key == 'sections' else set())
                    require(isinstance(image, dict) and set(image) == required and PHOTO_ID.fullmatch(image.get('id', '')))
                    text(image['alt'], 180, 1); integer(image['width'], 1, 1600); integer(image['height'], 1, 1600)
                    if key == 'sections': require(image['sectionId'] == item['id'], 'Public photograph ownership mismatch')
                    match = IMAGE_SRC.fullmatch(image.get('src', '')); require(match is not None)
                    raw = read_image(image['src'])
                    require(hashlib.sha256(raw).hexdigest() == match[1] and webp_dimensions(raw) == (image['width'], image['height']), 'Local public photograph mismatch')
        if domain == 'cms':
            expected = [{'id': entry['id'], **{field: entry[field] for field in ['version', 'kind', 'title', 'excerpt', 'place', 'publishedAt', 'updatedAt']},
                         'coverPhotoId': entry['photoIds'][0] if entry['photoIds'] else '', 'coverPhoto': entry['photos'][0] if entry['photos'] else None} for entry in value['entries']]
            require(value['summaries'] == expected, 'Incomplete public summary set')
    return {'status': 'NOT_AVAILABLE' if now - captured > timedelta(hours=24) else 'PASS', 'space': space, 'generation': manifest['generation']}


def retain_snapshot(output_root, space, *, now=None, fetch=None):
    """Carry one still-fresh public CDN generation into an ephemeral build.

    No IAM, database reads, source commits, redirects or arbitrary remote URLs.
    A genuinely absent first manifest is unavailable, never an invented feed.
    """
    require(space in CDN_HOSTS, 'Unexpected snapshot namespace')
    now = now or datetime.now(timezone.utc)
    fetch = fetch or bounded_request
    encoded, images, response_bytes, calls = {}, {}, 0, 0
    def read_public(path, maximum, *, missing_ok=False):
        nonlocal response_bytes, calls
        require(path in {'/data/public-content/' + name for name in ['manifest.json', *DOMAINS.values()]} or IMAGE_SRC.fullmatch(path), 'Unexpected public CDN path')
        calls += 1; require(calls <= MAX_CALLS, 'Public retention read bound reached')
        remaining = min(maximum, MAX_CDN_BYTES - response_bytes)
        require(remaining > 0, 'Public retention byte bound reached')
        raw = fetch(CDN_HOSTS[space] + path, {}, maximum=remaining, missing_ok=missing_ok)
        if raw is None:
            require(missing_ok, 'Incomplete public CDN copy'); return None
        require(isinstance(raw, bytes) and len(raw) <= remaining, 'Public retention byte bound reached')
        response_bytes += len(raw); return raw
    def read(name, maximum):
        raw = encoded[name]; require(len(raw) <= maximum, 'Public JSON export bound reached')
        value = json.loads(raw); require(isinstance(value, dict)); return value
    raw = read_public('/data/public-content/manifest.json', 16384, missing_ok=True)
    if raw is None: return {'status': 'NOT_AVAILABLE', 'space': space}
    encoded['manifest.json'] = raw
    manifest = read('manifest.json', 16384)
    captured = validate_manifest(manifest, space, now)
    if now - captured > timedelta(hours=24): return {'status': 'NOT_AVAILABLE', 'space': space}
    for name in DOMAINS.values(): encoded[name] = read_public('/data/public-content/' + name, MAX_JSON_BYTES)
    # Only enumerate expected image fields, with row/array bounds before any
    # download. Full schema and same-generation validation follows below.
    sources = set()
    for name, array_name, field in [('cms.json', 'entries', 'photos'), ('cms.json', 'summaries', 'coverPhoto'), ('website.json', 'sections', 'media')]:
        value = read(name, MAX_JSON_BYTES)
        require(all(value.get(key) == manifest[key] for key in ENVELOPE), 'Mixed or incomplete public CDN copy')
        rows = value.get(array_name)
        require(isinstance(rows, list) and len(rows) <= MAX_ROWS)
        for row in rows:
            require(isinstance(row, dict))
            values = ([row[field]] if row.get(field) else []) if field == 'coverPhoto' else row.get(field)
            require(isinstance(values, list) and len(values) <= 12)
            for image in values:
                require(isinstance(image, dict) and isinstance(image.get('src'), str) and IMAGE_SRC.fullmatch(image['src']))
                sources.add(image['src'])
    for src in sorted(sources):
        raw = read_public(src, MAX_IMAGE_BYTES)
        digest = IMAGE_SRC.fullmatch(src)[1]
        require(hashlib.sha256(raw).hexdigest() == digest, 'Public CDN image hash mismatch')
        webp_dimensions(raw); images[digest] = raw
    def read_image(src):
        return images[IMAGE_SRC.fullmatch(src)[1]]
    result = validate_copy(read, read_image, space, now=now)
    require(result['status'] == 'PASS', 'Public CDN copy is no longer fresh')
    install_snapshot({'encoded': encoded, 'images': images}, output_root)
    return result


def sync_guard(space):
    require(space in {'staging', 'production'}, 'Unexpected snapshot namespace')
    expected = 'refs/heads/main' if space == 'production' else 'refs/heads/staging'
    require(os.environ.get('GITHUB_REF') == expected and os.environ.get('REPOSITORY_VISIBILITY') == 'public', 'Snapshot branch or repository refused')
    if space == 'production': require(os.environ.get('PUBLIC_CONTENT_SNAPSHOT_ENABLED') == 'true', 'Production public snapshot is not enabled')


def main(argv=None):
    parser = argparse.ArgumentParser(); parser.add_argument('--mode', choices=['check', 'sync', 'retain'], default='check')
    parser.add_argument('--space', choices=['staging', 'production'], default='staging'); parser.add_argument('--output-root', type=Path, default=OUTPUT_ROOT)
    args = parser.parse_args(argv)
    if args.mode == 'check':
        result = check_local_snapshot(args.output_root, args.space)
        print(result['status'] + ': local public snapshot check; no network, publication or email action.'); return result
    if args.mode == 'retain':
        result = retain_snapshot(args.output_root, args.space)
        print(result['status'] + ': current public CDN copy checked; no authentication, database or email action.'); return result
    sync_guard(args.space)
    store = Store(); metadata = store.call(DATABASE)
    require(metadata.get('databaseEdition') == 'ENTERPRISE' and metadata.get('freeTier') is True, 'Existing free Enterprise database unavailable')
    bundle = build_snapshot(store, args.space); install_snapshot(bundle, args.output_root)
    print('Complete published-content snapshot assembled. No database write, email or provider operation.')
    return {'status': 'PASS', 'space': args.space, 'generation': bundle['documents']['manifest.json']['generation']}


if __name__ == '__main__':
    try: main()
    except Exception:
        print('Public snapshot unavailable; prior complete copy retained. No private content or credentials logged.', file=sys.stderr)
        sys.exit(1)
