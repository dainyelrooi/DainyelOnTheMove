"""Build the Atlas lookup from public-domain Natural Earth v5.1.2 reference data.

This is an optional authoring tool. The website serves the generated lookup
locally and never sends a check-in to an external geocoder.
"""
from collections import defaultdict
import json
from pathlib import Path
import re
import unicodedata
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/'
CODES = {row['code'] for row in json.loads((ROOT / 'data/countries.json').read_text('utf-8'))['countries']}

# The Atlas owner confirmed that his unqualified Miraflores label refers to the
# Lima district. Use the municipality's approximate point rounded to one decimal.
# https://www.miraflores.gob.pe/Gestorw3b/files/pdf/10203-24621-plan_de_contingencia_distrital.pdf
CITY_ADDITIONS = {'PE': {'miraflores': (-77.0, -12.1), 'mirafloreslima': (-77.0, -12.1)}}


def features(dataset):
    with urlopen(BASE + dataset + '.geojson', timeout=45) as response:
        return json.load(response)['features']


def fold(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', value).lower())


def point(lon, lat):
    if isinstance(lon, (int, float)) and isinstance(lat, (int, float)) and abs(lon) <= 180 and abs(lat) <= 90:
        return round(lon, 1), round(lat, 1)
    return None


def write_lookup(path, data):
    def compact(value):
        return json.dumps(value, sort_keys=True, separators=(',', ':'))
    lines = ',\n'.join(compact(key) + ':' + compact(value) for key, value in sorted(data.items()))
    (ROOT / path).write_text('{\n' + lines + '\n}\n', encoding='utf-8', newline='\n')


def main():
    countries = {}
    for dataset in ('ne_10m_admin_0_map_units', 'ne_110m_admin_0_countries'):
        points = defaultdict(set)
        for row in features(dataset):
            p = row['properties']
            code = next((p.get(key) for key in ('ISO_A2', 'ISO_A2_EH') if p.get(key) in CODES), None)
            anchor = point(p.get('LABEL_X'), p.get('LABEL_Y'))
            if code and anchor:
                points[code].add(anchor)
        countries.update({code: next(iter(values)) for code, values in points.items() if len(values) == 1})
    cities = defaultdict(lambda: defaultdict(set))
    for row in features('ne_10m_populated_places'):
        p = row['properties']
        code = p.get('ISO_A2')
        if code not in CODES or row['geometry']['type'] != 'Point':
            continue
        anchor = point(*row['geometry']['coordinates'][:2])
        if not anchor:
            continue
        for key in ('NAME', 'NAMEASCII', 'NAMEALT', 'NAME_EN', 'NAME_NL', 'NAME_ES', 'NAME_PT', 'NAME_FR'):
            name = p.get(key)
            if isinstance(name, str) and '\ufffd' not in name:
                for alias in name.split('|'):
                    if len(fold(alias)) > 1:
                        cities[code][fold(alias)].add(anchor)
    # Ambiguous names in a country get no city marker; the country remains visible.
    write_lookup('data/atlas-country-points.json', countries)
    city_points = {
        code: {name: next(iter(values)) for name, values in names.items() if len(values) == 1}
        for code, names in cities.items()
    }
    for code, additions in CITY_ADDITIONS.items():
        city_points.setdefault(code, {}).update(additions)
    write_lookup('data/atlas-city-points.json', city_points)


if __name__ == '__main__':
    main()
