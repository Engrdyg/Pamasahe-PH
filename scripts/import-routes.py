"""Convert the NCR jeepney / UV Express route shapefile into public/routes/ncr.json
for the route planner.

Input:  sources/ncr-routes/All Routes.shp (+ .dbf/.shx/.prj), WGS 84 / UTM 51N,
        fields: Route Name, Mode, Length, MC, Remarks, Class.
Output: public/routes/ncr.json — routes with fare mode, LTFRB memorandum circular
        and a simplified polyline (or several, for multi-part routes) in lat/lng.

Usage: pip install pyshp && python3 scripts/import-routes.py
"""
import json
import math
from pathlib import Path

import shapefile

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'sources/ncr-routes/All Routes'
OUT = ROOT / 'public/routes/ncr.json'

MODES = {
    'TPUJ': ('puj-traditional', None),
    'PUJ': ('puj-traditional', None),
    'MPUJ': ('puj-modern', None),
    'TPUJ/MPUJ': ('puj-traditional', 'puj-modern'),
    'UVE': ('uv-traditional', None),
    'TUVE': ('uv-traditional', None),
    'MUVE': ('uv-modern', None),
}
SIMPLIFY_M = 8      # Douglas–Peucker tolerance
JOIN_GAP_M = 150    # parts closer than this are joined into one line


def utm_to_latlng(x, y, zone=51):
    """Inverse transverse Mercator (WGS 84, northern hemisphere)."""
    a, f, k0 = 6378137.0, 1 / 298.257223563, 0.9996
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    x -= 500000.0
    m = y / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    p1 = (mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu)
          + (151 * e1 ** 3 / 96) * math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * math.sin(8 * mu))
    n1 = a / math.sqrt(1 - e2 * math.sin(p1) ** 2)
    t1 = math.tan(p1) ** 2
    c1 = ep2 * math.cos(p1) ** 2
    r1 = a * (1 - e2) / (1 - e2 * math.sin(p1) ** 2) ** 1.5
    d = x / (n1 * k0)
    lat = p1 - (n1 * math.tan(p1) / r1) * (d ** 2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4 / 24
                                          + (61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6 / 720)
    lng = (d - (1 + 2 * t1 + c1) * d ** 3 / 6 + (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5 / 120) / math.cos(p1)
    return math.degrees(lat), (zone - 1) * 6 - 180 + 3 + math.degrees(lng)


def simplify(pts, tol):
    """Douglas–Peucker on planar (UTM metre) points."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        (x1, y1), (x2, y2) = pts[i], pts[j]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy) or 1e-9
        best, idx = 0.0, -1
        for k in range(i + 1, j):
            x, y = pts[k]
            dist = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L
            if dist > best:
                best, idx = dist, k
        if best > tol:
            keep[idx] = True
            stack += [(i, idx), (idx, j)]
    return [p for p, k in zip(pts, keep) if k]


def chain(parts):
    """Join parts end to end (flipping as needed) when the gap is small;
    otherwise keep them as separate lines."""
    parts = [p for p in parts if len(p) >= 2]
    if not parts:
        return []
    lines = [parts.pop(0)]
    while parts:
        cur = lines[-1]
        best = None
        for k, p in enumerate(parts):
            for flip in (False, True):
                q = p[::-1] if flip else p
                for at_end in (True, False):
                    gap = math.dist(cur[-1], q[0]) if at_end else math.dist(q[-1], cur[0])
                    if best is None or gap < best[0]:
                        best = (gap, k, q, at_end)
        gap, k, q, at_end = best
        parts.pop(k)
        if gap <= JOIN_GAP_M:
            lines[-1] = cur + q[1:] if at_end else q[:-1] + cur
        else:
            lines.append(q)
    return lines


def main():
    r = shapefile.Reader(str(SRC), encoding='utf-8')
    routes, skipped = [], {}
    seen = set()
    for shape, rec in zip(r.shapes(), r.records()):
        name = (rec['Route Name'] or '').strip()
        remarks = (rec['Remarks'] or '').strip()
        mode_code = (rec['Mode'] or '').strip()
        why = None
        if not shape.points:
            why = 'no geometry'
        elif 'DUPLIC' in remarks.upper():
            why = 'duplicate'
        elif 'CLOSED' in remarks.upper():
            why = 'closed'
        elif mode_code not in MODES:
            why = f'unknown mode {mode_code!r}'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        bounds = list(shape.parts) + [len(shape.points)]
        parts = [[(p[0], p[1]) for p in shape.points[bounds[i]:bounds[i + 1]]] for i in range(len(shape.parts))]
        lines = [simplify(l, SIMPLIFY_M) for l in chain(parts)]
        key = (name.lower(), tuple(lines[0][0]), tuple(lines[0][-1]))
        if key in seen:
            skipped['same name and ends'] = skipped.get('same name and ends', 0) + 1
            continue
        seen.add(key)
        mode, alt = MODES[mode_code]
        length = sum(math.dist(a, b) for l in lines for a, b in zip(l, l[1:])) / 1000
        out = {
            'id': len(routes) + 1,
            'name': name.replace('Modified_', '').strip(),
            'mode': mode,
            'code': mode_code,
            'km': round(length, 2),
            'lines': [[[round(lat, 5), round(lng, 5)] for lat, lng in (utm_to_latlng(x, y) for x, y in l)] for l in lines],
        }
        if alt:
            out['altMode'] = alt
        if rec['MC']:
            out['mc'] = rec['MC'].strip()
        if remarks:
            out['remarks'] = remarks
        routes.append(out)
    data = {
        'source': 'NCR PUJ / UV Express route shapefile (LTFRB memorandum circular references), provided by the app owner',
        'routes': routes,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    pts = sum(len(l) for r_ in routes for l in r_['lines'])
    print(f'{len(routes)} routes, {pts} points, {OUT.stat().st_size / 1024:.0f} KB -> {OUT.relative_to(ROOT)}')
    print('skipped:', skipped)
    by = {}
    for r_ in routes:
        by[r_['mode']] = by.get(r_['mode'], 0) + 1
    print('by mode:', by)


if __name__ == '__main__':
    main()
