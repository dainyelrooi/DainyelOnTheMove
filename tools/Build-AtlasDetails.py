"""Prepare viewport tiles from public-domain Natural Earth v5.1.2 map data."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
from struct import unpack_from
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/'
OUTPUT = ROOT / 'data/atlas-detail'
TILE_WIDTH, TILE_HEIGHT = 1000 / 6, 500 / 4


def features(name, source):
    filename = name + '.geojson'
    if source:
        return json.loads((source / filename).read_bytes())['features']
    with urlopen(BASE + filename, timeout=45) as response:
        return json.load(response)['features']


def original_names(dataset, identifier, source):
    """Recover original UTF-8 names lost in the upstream GeoJSON exports."""
    filename = dataset + '.dbf'
    if source:
        data = (source / filename).read_bytes()
    else:
        with urlopen(BASE.replace('/geojson/', '/10m_cultural/') + filename, timeout=45) as response:
            data = response.read()
    records, header, size = unpack_from('<IHH', data, 4)
    fields, start = {}, 1
    for descriptor in range(32, header - 1, 32):
        key = data[descriptor:descriptor + 11].split(b'\x00', 1)[0].decode('ascii')
        width = data[descriptor + 16]
        fields[key] = (start, start + width)
        start += width
    names = {}
    for index in range(records):
        record = header + index * size
        if data[record] != 0x20:
            continue
        key_start, key_end = fields[identifier]
        name_start, name_end = fields['name']
        key = data[record + key_start:record + key_end].strip().decode('ascii')
        name = data[record + name_start:record + name_end].strip().decode('utf-8')
        if key and name:
            names[key] = name
    return names


def project(coords):
    lon, lat = coords[:2]
    return (lon + 180) / 360 * 1000, (90 - lat) / 180 * 500


def tile_for(x, y):
    return max(0, min(5, int(x / TILE_WIDTH))), max(0, min(3, int(y / TILE_HEIGHT)))


def simplify(points):
    """Retain vertices within 0.15 SVG units of the simplified border."""
    if len(points) < 3:
        return points
    pending = [(0, len(points) - 1)]
    keep = {0, len(points) - 1}
    while pending:
        first, last = pending.pop()
        x, y = points[first]
        dx, dy = points[last][0] - x, points[last][1] - y
        length_sq = dx * dx + dy * dy
        furthest, limit = None, .15 ** 2
        for index in range(first + 1, last):
            px, py = points[index][0] - x, points[index][1] - y
            t = max(0, min(1, (px * dx + py * dy) / length_sq)) if length_sq else 0
            error = (px - t * dx) ** 2 + (py - t * dy) ** 2
            if error > limit:
                furthest, limit = index, error
        if furthest is not None:
            keep.add(furthest)
            pending.extend(((first, furthest), (furthest, last)))
    return [points[index] for index in sorted(keep)]


def line_pieces(start, end):
    x, y = start
    dx, dy = end[0] - x, end[1] - y
    fractions = {0, 1}
    for origin, delta, size, count in ((x, dx, TILE_WIDTH, 6), (y, dy, TILE_HEIGHT, 4)):
        if delta:
            fractions.update(t for edge in range(1, count) if 0 < (t := (edge * size - origin) / delta) < 1)
    breaks = sorted(fractions)
    for begin, finish in zip(breaks, breaks[1:]):
        mid = (begin + finish) / 2
        tile = tile_for(x + mid * dx, y + mid * dy)
        yield tile, (x + begin * dx, y + begin * dy), (x + finish * dx, y + finish * dy)


def border_paths(source):
    tiles = defaultdict(list)
    allowed = {'Admin-1 boundary', 'Admin-1 region boundary'}
    for feature in features('ne_10m_admin_1_states_provinces_lines', source):
        geometry = feature['geometry']
        if not geometry or feature['properties']['FEATURECLA'] not in allowed:
            continue
        lines = [geometry['coordinates']] if geometry['type'] == 'LineString' else geometry['coordinates']
        for line in lines:
            points = simplify([project(coords) for coords in line])
            paths = defaultdict(list)
            for start, end in zip(points, points[1:]):
                if abs(end[0] - start[0]) > 500:
                    continue
                for tile, first, last in line_pieces(start, end):
                    a = tuple(round(value, 2) for value in first)
                    b = tuple(round(value, 2) for value in last)
                    if a == b:
                        continue
                    runs = paths[tile]
                    if runs and runs[-1][-1] == a:
                        runs[-1].append(b)
                    else:
                        runs.append([a, b])
            for tile, runs in paths.items():
                tiles[tile].extend('M' + ' '.join(f'{x:g},{y:g}' for x, y in run) for run in runs)
    return tiles


def label_tiles(source):
    provinces, cities = defaultdict(list), defaultdict(list)
    seen = set()
    province_dataset = 'ne_10m_admin_1_label_points'
    province_names = original_names(province_dataset, 'adm1_code', source)
    province_data = features(province_dataset, source)
    for feature in sorted(province_data, key=lambda row: row['properties']['datarank'] or 99):
        p = feature['properties']
        if p['featurecla'] != 'Admin-1 scale rank' or p['adm1_code'] in seen:
            continue
        name = province_names.get(p['adm1_code'], p['name'])
        if not name or '\ufffd' in name:
            continue
        seen.add(p['adm1_code'])
        x, y = project(feature['geometry']['coordinates'])
        provinces[tile_for(x, y)].append([round(x, 2), round(y, 2), name, p['scalerank']])
    city_dataset = 'ne_10m_populated_places_simple'
    city_names = original_names(city_dataset, 'ne_id', source)
    for feature in features(city_dataset, source):
        p = feature['properties']
        name = city_names.get(str(p['ne_id']), p['name'])
        if not name or '\ufffd' in name:
            name = p['nameascii']
        if not name or '\ufffd' in name:
            continue
        x, y = project(feature['geometry']['coordinates'])
        cities[tile_for(x, y)].append([round(x, 2), round(y, 2), name, p['min_zoom'], p['pop_max']])
    return provinces, cities


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, help='Read the Natural Earth GeoJSON and label DBF files from this folder.')
    source = parser.parse_args().source_dir
    borders = border_paths(source)
    provinces, cities = label_tiles(source)
    OUTPUT.mkdir(exist_ok=True)
    for x in range(6):
        for y in range(4):
            tile = (x, y)
            data = {
                'border': ''.join(borders[tile]),
                'provinces': sorted(provinces[tile], key=lambda row: row[3]),
                'cities': sorted(cities[tile], key=lambda row: (row[3], -row[4])),
            }
            path = OUTPUT / f'{x}-{y}.json'
            path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
