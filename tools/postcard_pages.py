"""Read only the already-public, delayed Postcard exports for static pages."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import re

ID = re.compile(r'brevo-[1-9][0-9]{0,12}\Z')
LINK = re.compile(r'/(?:[a-z0-9-]+(?:/[a-z0-9-]+)?)?(?:#[a-zA-Z0-9_-]+)?\Z')
IMAGE = re.compile(r'https://dainyelonthemove[.]com/assets/[a-zA-Z0-9/_-]+\.(?:webp|jpg|jpeg|png|avif)\Z')
DEFAULT_COVER = {'src': '/assets/postcards-cover.svg', 'alt': 'Postcards from Dainyel — a little piece of the journey', 'caption': 'Postcards from Dainyel'}


def load_covers(root):
    path = Path(root) / 'data/postcards/covers.json'
    covers = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'schemaVersion': 1, 'default': DEFAULT_COVER, 'editions': {}}
    if set(covers) != {'schemaVersion', 'default', 'editions'} or covers['schemaVersion'] != 1 or not isinstance(covers['editions'], dict):
        raise ValueError('Invalid public Postcard cover settings')
    for identifier, cover in [('default', covers['default']), *covers['editions'].items()]:
        if identifier != 'default' and not ID.fullmatch(identifier):
            raise ValueError('Invalid public Postcard cover ID')
        if not isinstance(cover, dict) or set(cover) != {'src', 'alt', 'caption'} or not all(isinstance(cover[k], str) for k in cover):
            raise ValueError('Invalid public Postcard cover')
        if cover['src'] != DEFAULT_COVER['src'] and not re.fullmatch(r'/assets/[a-zA-Z0-9/_-]+\.(?:webp|jpg|jpeg|png|avif)', cover['src']):
            raise ValueError('Postcard covers must use approved local images')
        if not cover['alt'].strip() or len(cover['alt']) > 300 or len(cover['caption']) > 300:
            raise ValueError('Invalid public Postcard cover description')
    return covers


def stamp(value):
    if not isinstance(value, str):
        raise ValueError('Invalid public Postcard date')
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Public Postcard date needs a timezone')
    return parsed


def load_editions(root, now=None):
    root = Path(root)
    index = root / 'data/postcards/index.json'
    if not index.exists():
        return []
    data = json.loads(index.read_text(encoding='utf-8'))
    if data.get('schemaVersion') != 1 or not isinstance(data.get('editions'), list) or len(data['editions']) > 500:
        raise ValueError('Invalid public Postcard index')
    now = now or datetime.now(timezone.utc)
    covers = load_covers(root)
    result, seen = [], set()
    for row in data['editions']:
        identifier = row.get('id')
        if not isinstance(identifier, str) or not ID.fullmatch(identifier) or identifier in seen:
            raise ValueError('Invalid or duplicate public Postcard ID')
        seen.add(identifier)
        edition = json.loads((root / 'data/postcards/editions' / (identifier + '.json')).read_text(encoding='utf-8'))
        if edition.get('id') != identifier or set(edition) - {'id', 'exportVersion', 'title', 'subject', 'sentAt', 'availableAt', 'paragraphs', 'links', 'photo'}:
            raise ValueError('Invalid public Postcard projection')
        sent, available = stamp(edition['sentAt']), stamp(edition['availableAt'])
        if available < sent + timedelta(hours=24):
            raise ValueError('Public Postcard must follow sending by at least 24 hours')
        if available > now:
            continue
        title, paragraphs, links = edition.get('title'), edition.get('paragraphs'), edition.get('links', [])
        excerpt = row.get('excerpt', '')
        if not isinstance(excerpt, str) or len(excerpt) > 1200:
            raise ValueError('Invalid public Postcard excerpt')
        if not isinstance(title, str) or not title.strip() or len(title) > 240:
            raise ValueError('Invalid public Postcard title')
        if not isinstance(paragraphs, list) or not 1 <= len(paragraphs) <= 70 or any(not isinstance(p, str) or len(p) > 12000 for p in paragraphs):
            raise ValueError('Invalid public Postcard text')
        if not isinstance(links, list) or len(links) > 12 or any(not isinstance(link, str) or not LINK.fullmatch(link) or re.match(r'/(admin|studio|search|postcards-form)(?:[/#]|$)', link) for link in links):
            raise ValueError('Invalid public Postcard links')
        photo = edition.get('photo')
        if photo is not None and (not isinstance(photo, dict) or set(photo) - {'src', 'alt'} or not IMAGE.fullmatch(photo.get('src', '')) or not isinstance(photo.get('alt', ''), str)):
            raise ValueError('Invalid public Postcard photo')
        # An explicit website cover can replace a generic image from the email;
        # the archived export and the already-sent message stay unchanged.
        cover = covers['editions'].get(identifier) or (covers['default'] if photo is None else None)
        if cover: photo = {'src': 'https://dainyelonthemove.com' + cover['src'], 'alt': cover['alt']}
        result.append({**edition, 'photo': photo, 'coverNote': cover['caption'] if cover else '', 'excerpt': excerpt, 'filename': 'postcard-' + identifier + '.html', 'url': '/postcard-' + identifier})
    return sorted(result, key=lambda item: stamp(item['sentAt']), reverse=True)
