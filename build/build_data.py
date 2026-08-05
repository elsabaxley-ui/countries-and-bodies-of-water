import json, math, os, re

D = os.path.dirname(os.path.abspath(__file__))

W = 2000.0
def project(lon, lat):
    lam = math.radians(lon); phi = math.radians(lat)
    p2 = phi*phi; p4 = p2*p2; p6 = p4*p2; p8 = p4*p4; p10 = p8*p2; p12 = p10*p2
    x = lam * (0.8707 - 0.131979*p2 - 0.013791*p4 + 0.003971*p10 - 0.001529*p12)
    y = phi * (1.007226 + 0.015085*p2 - 0.044475*p6 + 0.028874*p8 - 0.005916*p10)
    return x, y

XMAX = project(180, 0)[0]
YMAX = project(0, 90)[1]
SCALE = (W/2) / XMAX
H = round(2 * YMAX * SCALE, 2)

def to_svg(lon, lat):
    x, y = project(lon, lat)
    return (W/2 + x*SCALE, H/2 - y*SCALE)

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts)-1)]
    while stack:
        a, b = stack.pop()
        if b <= a+1: continue
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx-ax, by-ay
        nrm = math.hypot(dx, dy)
        best = -1.0; idx = -1
        for i in range(a+1, b):
            px, py = pts[i]
            if nrm == 0:
                d = math.hypot(px-ax, py-ay)
            else:
                d = abs(dy*px - dx*py + bx*ay - by*ax) / nrm
            if d > best: best = d; idx = i
        if best > tol:
            keep[idx] = True
            stack.append((a, idx)); stack.append((idx, b))
    return [p for p, k in zip(pts, keep) if k]

def ring_area(ring):
    s = 0.0
    for i in range(len(ring)-1):
        x1, y1 = ring[i]; x2, y2 = ring[i+1]
        s += x1*y2 - x2*y1
    return abs(s)/2

def slug(s):
    return re.sub(r'_+', '_', re.sub(r'[^A-Za-z0-9]+', '_', s)).strip('_')

def label_point(rings):
    """Pole of inaccessibility: the interior point farthest from any edge.

    A plain area centroid falls outside concave shapes — Norway's crescent puts
    it in Sweden — so grid-search for the deepest interior point instead.
    Returns (x, y, clearance). Rings are (outer, hole, hole, ...) in svg space.
    """
    xs = [p[0] for p in rings[0]]; ys = [p[1] for p in rings[0]]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    segs = []
    for r in rings:
        for i in range(len(r)-1):
            segs.append((r[i][0], r[i][1], r[i+1][0], r[i+1][1]))

    def inside(px, py):
        c = False
        for ax, ay, bx, by in segs:
            if (ay > py) != (by > py):
                if px < (bx-ax)*(py-ay)/(by-ay) + ax: c = not c
        return c

    def clearance(px, py):
        best = 1e18
        for ax, ay, bx, by in segs:
            dx, dy = bx-ax, by-ay
            dd = dx*dx + dy*dy
            t = 0.0 if dd == 0 else max(0.0, min(1.0, ((px-ax)*dx + (py-ay)*dy)/dd))
            ex, ey = px-ax-t*dx, py-ay-t*dy
            d = ex*ex + ey*ey
            if d < best: best = d
        return math.sqrt(best)

    best = (None, None, -1.0)
    cx0, cx1, cy0, cy1 = x0, x1, y0, y1
    n = 24
    for _ in range(4):
        sx = (cx1-cx0)/(n+1) or 1e-6
        sy = (cy1-cy0)/(n+1) or 1e-6
        for i in range(1, n+1):
            px = cx0 + i*sx
            for j in range(1, n+1):
                py = cy0 + j*sy
                if not inside(px, py): continue
                c = clearance(px, py)
                if c > best[2]: best = (px, py, c)
        if best[0] is None: break
        cx0, cx1 = best[0]-sx, best[0]+sx
        cy0, cy1 = best[1]-sy, best[1]+sy
        n = 10
    if best[0] is None:
        return (sum(xs)/len(xs), sum(ys)/len(ys), 0.0)
    return best


def polys_of(geom):
    t = geom['type']
    if t == 'Polygon': return [geom['coordinates']]
    if t == 'MultiPolygon': return geom['coordinates']
    return []

def build(features, tol_scale=1.0, min_ring=0.0025):
    """features: list of geojson geometries -> (svg path string, meta)"""
    polys = []
    for geom in features:
        for poly in polys_of(geom):
            polys.append(poly)
    entries = []
    for poly in polys:
        outer = poly[0]
        a = ring_area(outer)
        entries.append((a, poly))
    entries.sort(key=lambda e: -e[0])
    total = sum(e[0] for e in entries) or 1.0

    parts = []
    kept = []
    for a, poly in entries:
        if a < min_ring and kept: continue
        rings_out = []
        for ri, ring in enumerate(poly):
            ra = ring_area(ring)
            if ri > 0 and ra < min_ring: continue
            diag = math.hypot(max(p[0] for p in ring)-min(p[0] for p in ring),
                              max(p[1] for p in ring)-min(p[1] for p in ring))
            tol = min(0.20, max(0.012, diag/260.0)) * tol_scale
            simp = dp(ring, tol)
            if len(simp) < 4: simp = ring if len(ring) <= 6 else dp(ring, tol/4)
            if len(simp) < 4: continue
            rings_out.append(simp)
        if not rings_out: continue
        kept.append((a, rings_out))

    # geometry stats from kept polygons
    cum = 0.0; core = []
    for a, rings in kept:
        core.append(rings[0]); cum += a
        if cum >= 0.85*total: break

    def bbox_of(rings_list):
        xs = []; ys = []
        for r in rings_list:
            for lon, lat in r:
                x, y = to_svg(lon, lat); xs.append(x); ys.append(y)
        return [min(xs), min(ys), max(xs), max(ys)]

    for a, rings in kept:
        for ring in rings:
            pts = [to_svg(lon, lat) for lon, lat in ring]
            d = 'M' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + 'Z'
            parts.append(d)

    # the label point comes from whichever of the biggest few polygons has the
    # most room inside it — for the Arctic Ocean that is not the largest one
    cx = cy = None; bestc = -1.0
    for _, rings in kept[:3]:
        pr = [[to_svg(lon, lat) for lon, lat in r] for r in rings]
        px, py, c = label_point(pr)
        if c > bestc: bestc = c; cx, cy = px, py

    full = bbox_of([r for _, rings in kept for r in rings[:1]])
    zb = bbox_of(core)
    px_area = sum(ring_area([to_svg(lon, lat) for lon, lat in rings[0]]) for _, rings in kept)
    return ''.join(parts), {
        'c': [round(cx, 1), round(cy, 1)],
        'zb': [round(v, 1) for v in zb],
        'bb': [round(v, 1) for v in full],
        'a': round(px_area, 1),
    }

# ---------------------------------------------------------------- load
countries = json.load(open(f'{D}/ne_50m_admin_0_countries.geojson'))['features']
marine    = json.load(open(f'{D}/ne_50m_geography_marine_polys.geojson'))['features']
lakes     = json.load(open(f'{D}/ne_50m_lakes.geojson'))['features']

QUIZ_COUNTRIES = [
    ('United States','United States of America','na'), ('Canada','Canada','na'), ('Mexico','Mexico','na'),
    ('Panama','Panama','na'), ('Costa Rica','Costa Rica','na'), ('Cuba','Cuba','na'),
    ('Colombia','Colombia','sa'), ('Venezuela','Venezuela','sa'), ('Brazil','Brazil','sa'),
    ('Argentina','Argentina','sa'), ('Chile','Chile','sa'), ('Bolivia','Bolivia','sa'),
    ('United Kingdom','United Kingdom','eu'), ('France','France','eu'), ('Spain','Spain','eu'),
    ('Italy','Italy','eu'), ('Germany','Germany','eu'), ('Norway','Norway','eu'),
    ('Sweden','Sweden','eu'), ('Iceland','Iceland','eu'), ('Switzerland','Switzerland','eu'),
    ('Greece','Greece','eu'), ('Poland','Poland','eu'), ('Ukraine','Ukraine','eu'),
    ('Russia','Russia','eu'),
    ('Turkey','Turkey','me'), ('Israel','Israel','me'), ('Syria','Syria','me'),
    ('Iran','Iran','me'), ('Iraq','Iraq','me'), ('Saudi Arabia','Saudi Arabia','me'),
    ('Egypt','Egypt','af'), ('Sudan','Sudan','af'), ('Zimbabwe','Zimbabwe','af'),
    ('Libya','Libya','af'), ('Morocco','Morocco','af'), ('Nigeria','Nigeria','af'),
    ('Djibouti','Djibouti','af'), ('Somalia','Somalia','af'),
    ('Dem. Rep. of the Congo','Dem. Rep. Congo','af'), ('Ethiopia','Ethiopia','af'),
    ('Kenya','Kenya','af'), ('South Africa','South Africa','af'), ('Ghana','Ghana','af'),
    ('Afghanistan','Afghanistan','as'), ('Pakistan','Pakistan','as'), ('India','India','as'),
    ('Bangladesh','Bangladesh','as'), ('Malaysia','Malaysia','as'), ('China','China','as'),
    ('Japan','Japan','as'), ('South Korea','South Korea','as'), ('Indonesia','Indonesia','as'),
    ('Vietnam','Vietnam','as'), ('Singapore','Singapore','as'), ('Philippines','Philippines','as'),
    ('Australia','Australia','oc'), ('New Zealand','New Zealand','oc'),
]

QUIZ_WATER = [
    ('Atlantic Ocean', ['North Atlantic Ocean','South Atlantic Ocean'], 'marine'),
    ('Pacific Ocean', ['North Pacific Ocean','South Pacific Ocean'], 'marine'),
    ('Indian Ocean', ['INDIAN OCEAN'], 'marine'),
    ('Arctic Ocean', ['Arctic Ocean'], 'marine'),
    ('Hudson Bay', ['Hudson Bay','James Bay'], 'marine'),
    ('The Great Lakes', ['Lake Superior','Lake Michigan','Lake Huron','Lake Erie','Lake Ontario'], 'lake'),
    ('Caribbean Sea', ['Caribbean Sea'], 'marine'),
    ('Gulf of Mexico', ['Gulf of Mexico','Bahía de Campeche'], 'marine'),
    ('Mediterranean Sea', ['Mediterranean Sea','Adriatic Sea','Aegean Sea','Ionian Sea','Tyrrhenian Sea','Balearic Sea','Golfe du Lion'], 'marine'),
    ('Black Sea', ['Black Sea'], 'marine'),
    ('Arabian Sea', ['Arabian Sea'], 'marine'),
    ('Red Sea', ['Red Sea'], 'marine'),
    ('Caspian Sea', ['Caspian Sea'], 'marine'),
    ('Aral Sea', ['North Aral Sea','South Aral Sea'], 'lake'),
    ('Persian Gulf', ['Persian Gulf'], 'marine'),
    ('South China Sea', ['South China Sea'], 'marine'),
    ('Yellow Sea', ['Yellow Sea','Bo Hai'], 'marine'),
    ('Sea of Japan/East Sea', ['Sea of Japan'], 'marine'),
]

EXTRA_LAKES = ['Lake Victoria','Lake Tanganyika','Lake Baikal','Lake Malawi','Lake Balkhash',
               'Lake Ladoga','Great Bear Lake','Great Slave Lake','Lake Winnipeg','Lake Titicaca',
               'Lake Turkana','Lake Nasser','Lake Chad','Lake Onega','Lake Athabasca',
               'Lake Nicaragua','Vänern','Lake Urmia','Issyk Kul','Reindeer Lake']

by_admin = {}
for f in countries:
    by_admin.setdefault(f['properties']['NAME'], []).append(f['geometry'])

marine_by = {}
for f in marine:
    marine_by.setdefault(f['properties'].get('name'), []).append(f['geometry'])
lake_by = {}
for f in lakes:
    lake_by.setdefault(f['properties'].get('name'), []).append(f['geometry'])

out = {'w': W, 'h': H, 'land': [], 'water': [], 'quiz': {}}

quiz_country_ne = {ne: (disp, reg) for disp, ne, reg in QUIZ_COUNTRIES}

# --- all countries as land (quiz + non-quiz, all identifiable on click)
for name, geoms in sorted(by_admin.items()):
    disp, reg = quiz_country_ne.get(name, (name, None))
    d, meta = build(geoms)
    if not d: continue
    rec = {'id': 'c_' + slug(disp), 'n': disp, 'd': d}
    if reg:
        rec['q'] = 1
        out['quiz'][rec['id']] = {'n': disp, 'k': 'country', 'r': reg, **meta}
    out['land'].append(rec)

# --- water
for disp, sources, kind in QUIZ_WATER:
    src = marine_by if kind == 'marine' else lake_by
    geoms = []
    for s in sources:
        if s not in src: raise SystemExit(f'missing water source: {s}')
        geoms += src[s]
    d, meta = build(geoms, min_ring=0.0008)
    wid = 'w_' + slug(disp.split('/')[0])
    out['water'].append({'id': wid, 'n': disp, 'd': d, 'q': 1, 'k': kind})
    out['quiz'][wid] = {'n': disp, 'k': 'water', 'r': 'water', **meta}

# every other named sea stays on the map, unquizzed but identifiable when clicked
used = {s for _, srcs, _ in QUIZ_WATER for s in srcs}
for mname in sorted(marine_by):
    if mname in used or not mname: continue
    d, meta = build(marine_by[mname], min_ring=0.0008)
    disp = mname.title() if mname.isupper() else mname
    out['water'].append({'id': 'm_' + slug(disp), 'n': disp, 'd': d, 'k': 'marine'})

for lname in EXTRA_LAKES:
    if lname not in lake_by: continue
    d, meta = build(lake_by[lname], min_ring=0.0008)
    out['water'].append({'id': 'x_' + slug(lname), 'n': lname, 'd': d, 'k': 'lake'})

ids = [f['id'] for f in out['land']] + [f['id'] for f in out['water']]
assert len(ids) == len(set(ids)), 'duplicate feature id'

js = json.dumps(out, separators=(',', ':'))
open(f'{D}/mapdata.json', 'w').write(js)
print('viewbox', W, H)
print('land', len(out['land']), 'water', len(out['water']), 'quiz', len(out['quiz']))
print('bytes', len(js))
small = sorted(((v['a'], k) for k, v in out['quiz'].items()))[:12]
print('smallest:', [(k, a) for a, k in small])
