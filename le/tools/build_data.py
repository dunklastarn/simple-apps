#!/usr/bin/env python3
"""
Builds le/data/*.js and le/flags/*.svg from public datasets.

Sources (clone them anywhere, pass the folder):
  https://github.com/mledoze/countries          (ODbL) country facts, shapes, flags
  https://github.com/tabatkins/wordle-list      valid 5-letter guesses
  https://github.com/first20hours/google-10000-english   word frequency (answers)
  https://github.com/samayo/country-json        population (approx. 2018)

Usage: python3 le/tools/build_data.py /path/to/sources
"""
import json, math, os, re, shutil, sys, random

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
LE = os.path.dirname(HERE)
C = os.path.join(SRC, 'countries')

# ---------- countries ----------
SKIP = {'ATA', 'BVT', 'HMD', 'UMI', 'ATF', 'SGS', 'IOT', 'SJM'}
EXTRA_DAILY = {'TWN', 'UNK', 'PSE', 'GRL', 'PRI', 'HKG', 'ESH'}
RENAME = {'TUR': 'Turkey', 'COG': 'Republic of the Congo', 'COD': 'DR Congo',
          'UNK': 'Kosovo', 'MKD': 'North Macedonia', 'CIV': 'Ivory Coast',
          'SHN': 'Saint Helena', 'VAT': 'Vatican City'}
EXTRA_ALT = {
    'USA': ['USA', 'US', 'America', 'United States of America'],
    'GBR': ['UK', 'Britain', 'Great Britain', 'England', 'United Kingdom'],
    'ARE': ['UAE', 'Emirates'], 'COD': ['DRC', 'Democratic Republic of the Congo', 'Congo-Kinshasa', 'Zaire'],
    'COG': ['Congo', 'Congo-Brazzaville', 'Congo Republic'], 'CZE': ['Czech Republic', 'Czechia'],
    'TUR': ['Türkiye', 'Turkiye'], 'CIV': ["Côte d'Ivoire", 'Cote dIvoire'], 'MMR': ['Burma'],
    'SWZ': ['Swaziland', 'Eswatini'], 'CPV': ['Cabo Verde'], 'TLS': ['East Timor'],
    'KOR': ['Korea', 'Republic of Korea'], 'PRK': ['DPRK'], 'NLD': ['Holland'],
    'VAT': ['Vatican', 'Holy See'], 'MKD': ['Macedonia'], 'RUS': ['Russian Federation'],
    'LAO': ['Lao'], 'BIH': ['Bosnia'], 'FSM': ['Micronesia'], 'PSE': ['Palestinian Territories'],
}

def ring_area(r):
    s = 0.0
    for i in range(len(r) - 1):
        s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    return s / 2.0

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L == 0: d = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
                d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d > best: best, bi = d, i
        if best > tol * tol:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def simplify_country(geom):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    allpts = [p for poly in polys for ring in poly for p in ring]
    xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
    diag = math.hypot(max(xs) - min(xs), max(ys) - min(ys))
    tol = min(0.06, max(0.0015, diag * 0.0025))
    nd = 2 if tol >= 0.02 else 3
    maxa = max(abs(ring_area(poly[0])) for poly in polys)
    out = []
    for poly in polys:
        a = abs(ring_area(poly[0]))
        if a < maxa * 0.0004 and len(polys) > 1 and a < 0.3: continue
        rings = []
        for k, ring in enumerate(poly):
            if k > 0 and abs(ring_area(ring)) < maxa * 0.002: continue
            r = dp(ring, tol)
            r = [[round(x, nd), round(y, nd)] for x, y in r]
            r2 = [r[0]]
            for p in r[1:]:
                if p != r2[-1]: r2.append(p)
            if r2[0] != r2[-1]: r2.append(r2[0])
            if len(r2) < 4:
                if k == 0:  # tiny island: keep as a small triangle so it still exists
                    x, y = ring[0][0], ring[0][1]; e = tol
                    r2 = [[round(x, nd), round(y, nd)], [round(x + e, nd), round(y, nd)],
                          [round(x, nd), round(y + e, nd)], [round(x, nd), round(y, nd)]]
                else: continue
            # d3-geo wants exterior rings clockwise, holes counter-clockwise
            cw = ring_area(r2) < 0
            if (k == 0) != cw: r2.reverse()
            rings.append(r2)
        if rings: out.append(rings)
    return out

def load_population():
    base = os.path.join(SRC, 'country-json', 'src')
    ab = json.load(open(os.path.join(base, 'country-by-abbreviation.json')))
    pop = json.load(open(os.path.join(base, 'country-by-population.json')))
    m = {a['country']: a['abbreviation'] for a in ab}
    m.update({'Cabo Verde': 'CV', 'East Timor': 'TL', 'United Kingdom': 'GB'})
    out = {}
    for p in pop:
        code = m.get(p['country'])
        if code and p.get('population'): out[code] = int(p['population'])
    return out

def build_countries():
    data = json.load(open(os.path.join(C, 'countries.json')))
    POP = load_population()
    res = []; total = 0
    for c in data:
        code = c['cca3']
        if code in SKIP: continue
        gpath = os.path.join(C, 'data', code.lower() + '.geo.json')
        fpath = os.path.join(C, 'data', code.lower() + '.svg')
        if not os.path.exists(gpath) or not os.path.exists(fpath): continue
        fc = json.load(open(gpath))
        geoms = [f['geometry'] for f in fc['features'] if f.get('geometry')]
        if not geoms: continue
        polys = []
        for g in geoms:
            polys += simplify_country(g)
        total += sum(len(r) for p in polys for r in p)
        name = RENAME.get(code, c['name']['common'])
        alts = set([c['name']['common'], c['name']['official']] + EXTRA_ALT.get(code, []))
        alts |= {a for a in c.get('altSpellings', []) if len(a) > 3}
        alts.discard(name)
        daily = bool(c['independent']) or code in EXTRA_DAILY
        shutil.copy(fpath, os.path.join(LE, 'flags', code.lower() + '.svg'))
        res.append({'c': code, 'n': name, 'a': sorted(alts), 'll': c['latlng'],
                    'b': c.get('borders', []), 'd': 1 if daily else 0,
                    'ar': c.get('area', 0), 'g': polys,
                    'cap': (c.get('capital') or [''])[0],
                    'cur': [v['name'] for v in (c.get('currencies') or {}).values()],
                    'lang': list((c.get('languages') or {}).values()),
                    'pop': POP.get(c['cca2'], 0)})
    res.sort(key=lambda x: x['n'])
    with open(os.path.join(LE, 'data', 'countries.js'), 'w') as f:
        f.write('/* Generated by tools/build_data.py from mledoze/countries (ODbL). */\n')
        f.write('window.COUNTRIES=' + json.dumps(res, separators=(',', ':'), ensure_ascii=False) + ';\n')
    print('countries', len(res), 'daily', sum(r['d'] for r in res), 'points', total)

# ---------- words ----------
BLOCK = set('''yahoo login china linux india japan smith peter spain bible vegas naked admin jesus harry
kelly intel henry devel cisco adobe greek costa lewis allen swiss dutch honda roman roger inter kerry chile
maria trans booty terry jerry laura gonna billy craig nancy jimmy barry ralph carol wanna perry ebook mason
tommy congo colin sudan oscar randy donna danny julia tyler welsh sonic diane thong devon gotta betty diana
jesse cohen promo rehab condo monte leone verde xerox allan sperm craps sally emacs chevy dover kinda burke
moses logan spank niger grams mambo fatty email texas paris kevin larry jones james david brian scott linda
sarah susan karen keith wayne bruce simon frank eric anna davis mike mary lisa''' .split())

def build_words():
    valid = sorted(set(open(os.path.join(SRC, 'wordle-list', 'words')).read().split()))
    freq = [w.strip() for w in open(os.path.join(SRC, 'google-10000-english', 'google-10000-english-usa-no-swears.txt'))]
    fs = set(freq); vs = set(valid)
    ans = []
    for w in freq:
        if len(w) != 5 or not w.isalpha() or w not in vs or w in BLOCK: continue
        if w.endswith('s') and not w.endswith('ss') and (w[:-1] in fs or w[:-2] in fs): continue
        if w.endswith('ed') and (w[:-2] in fs or w[:-1] in fs): continue
        ans.append(w)
    random.Random(20261126).shuffle(ans)
    with open(os.path.join(LE, 'data', 'words.js'), 'w') as f:
        f.write('/* Generated by tools/build_data.py. */\n')
        f.write('window.WORD_ANSWERS=' + json.dumps(ans, separators=(',', ':')) + ';\n')
        f.write('window.WORD_VALID="' + ''.join(valid) + '";\n')
    print('answers', len(ans), 'valid', len(valid))

build_countries()
build_words()
