"""Validate the public reveal file without printing its content. Standard library only."""
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlsplit
import json
import re
import sys

ROOT = Path(__file__).resolve().parent.parent


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value, label, maximum=240):
    require(isinstance(value, str) and 0 < len(value.strip()) <= maximum, label + ' must be non-empty text within its size limit.')


def fields(value, allowed, required, label):
    require(isinstance(value, dict), label + ' must be an object.')
    require(set(value) <= set(allowed) and set(required) <= set(value), label + ' contains unsupported or missing fields.')


def timestamp(value, label):
    text(value, label, 40)
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(parsed.tzinfo is not None, label + ' needs an explicit timezone.')


def validate(trip):
    fields(trip, ['id', 'title', 'departureAt', 'timeZone', 'confirmedDepartureAt', 'endedAt', 'revealedStops', 'currentLocation'], ['title', 'departureAt', 'revealedStops', 'currentLocation'], 'Trip')
    require(trip['title'] == 'Trip to Latin America', 'Keep the approved public trip title.')
    require(trip['departureAt'] == '2026-10-28T00:00:00+01:00', 'Keep the confirmed departure time unless the owner approves a change.')
    require(trip.get('timeZone', 'Europe/Amsterdam') == 'Europe/Amsterdam', 'Use the approved reporting timezone.')
    for key in ['confirmedDepartureAt', 'endedAt']:
        if trip.get(key):
            timestamp(trip[key], key)
    require(isinstance(trip['revealedStops'], list), 'Revealed stops must be a list.')
    identifiers = set()
    for stop in trip['revealedStops']:
        fields(stop, ['id', 'country', 'city', 'date', 'text', 'photos', 'storyUrl', 'coordinates'], ['id', 'country', 'date', 'text'], 'Revealed stop')
        text(stop['id'], 'Stop ID', 80)
        require(re.fullmatch(r'[a-z0-9-]+', stop['id']) and stop['id'] not in identifiers, 'Stop IDs must be unique lowercase slugs.')
        identifiers.add(stop['id'])
        text(stop['country'], 'Country', 100)
        if 'city' in stop:
            text(stop['city'], 'City', 100)
        require(isinstance(stop['date'], str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', stop['date']), 'A revealed date must use YYYY-MM-DD.')
        date.fromisoformat(stop['date'])
        text(stop['text'], 'Reveal text', 600)
        if 'coordinates' in stop:
            coordinates = stop['coordinates']
            require(isinstance(coordinates, list) and len(coordinates) == 2, 'Coordinates must be a broad longitude/latitude pair.')
            for value, limit in zip(coordinates, [180, 90]):
                require(type(value) in (float, int) and -limit <= value <= limit and abs(value * 10 - round(value * 10)) < 0.000001, 'Use an approximate centre rounded to at most one decimal, never device GPS.')
        if 'photos' in stop:
            require(isinstance(stop['photos'], list), 'Photos must be a list.')
            for photo in stop['photos']:
                fields(photo, ['src', 'alt', 'caption'], ['src', 'alt'], 'Photo')
                text(photo['alt'], 'Photo alternative text', 300)
                src = photo['src']
                require(isinstance(src, str) and re.fullmatch(r'/?assets/[a-zA-Z0-9_./-]+\.(webp|jpe?g|png|avif)', src) and '..' not in src, 'Photo paths must reference local image assets.')
                require((ROOT / src.lstrip('/')).is_file(), 'A referenced photo does not exist.')
                if 'caption' in photo:
                    text(photo['caption'], 'Photo caption', 300)
        if 'storyUrl' in stop:
            url = stop['storyUrl']
            require(isinstance(url, str) and re.fullmatch(r'[a-z0-9-]+\.html(?:#[a-z0-9-]+)?', url), 'Story URLs must point to an existing local story.')
            parts = urlsplit(url)
            path = ROOT / parts.path
            require(path.is_file(), 'A referenced story does not exist.')
            if parts.fragment:
                require(re.search(r'id=[\"\x27]' + re.escape(parts.fragment) + r'[\"\x27]', path.read_text(encoding='utf-8')), 'A referenced story anchor does not exist.')
    if trip['currentLocation'] is not None:
        current = trip['currentLocation']
        fields(current, ['city', 'country', 'updatedAt'], ['city', 'country', 'updatedAt'], 'Shared current location')
        text(current['city'], 'Shared city', 100)
        text(current['country'], 'Shared country', 100)
        timestamp(current['updatedAt'], 'Shared location timestamp')


if __name__ == '__main__':
    try:
        path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data/trip.json'
        validate(json.loads(path.read_text(encoding='utf-8')))
        print('PASS: public trip schema and local references are valid. Publish only owner-approved reveals.')
    except (ValueError, TypeError, KeyError, OSError):
        print('FAIL: check the public trip schema, dates, broad coordinates and local photo/story references.', file=sys.stderr)
        sys.exit(1)
