"""Tiny local map-tile server for the video capture (OSM is not reachable from
the render machine). Draws a plausible street grid plus EDSA from the Busway
station coordinates. Usage: python3 tiles.py <port>"""
import io, json, math, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
d = json.loads((ROOT / 'fares/edsa-busway.json').read_text())
EDSA = [(s['lat'], s['lng']) for s in d['directions']['southbound']['stationInfo']]

def px(lat, lng, z):
    n = 256 * 2 ** z
    x = (lng + 180) / 360 * n
    s = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
    return x, y

def h(i):
    i = (i * 2654435761) & 0xFFFFFFFF
    return ((i ^ (i >> 13)) * 1274126177 & 0xFFFFFFFF) / 0xFFFFFFFF

def tile(z, tx, ty):
    S = 2  # supersample
    im = Image.new('RGB', (256 * S, 256 * S), '#f2efe9')
    g = ImageDraw.Draw(im)
    ox, oy = tx * 256, ty * 256
    def P(lat, lng):
        x, y = px(lat, lng, z)
        return ((x - ox) * S, (y - oy) * S)
    # bounds in lat/lng
    def inv(x, y):
        n = 256 * 2 ** z
        lng = x / n * 360 - 180
        lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
        return lat, lng
    lat0, lng0 = inv(ox - 20, oy + 276)
    lat1, lng1 = inv(ox + 276, oy - 20)
    step = 0.0012 if z >= 15 else 0.0036 if z >= 13 else 0.012
    w_minor = max(1, int((z - 12) * 1.6)) * S
    # parks
    for i in range(int(lng0 / step) - 1, int(lng1 / step) + 2):
        for j in range(int(lat0 / step) - 1, int(lat1 / step) + 2):
            if h(i * 7919 + j * 104729) < 0.07:
                a = P(j * step, i * step); b = P((j + 1) * step, (i + 1) * step)
                g.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill='#cdebc0')
    # minor streets
    for i in range(int(lng0 / step) - 1, int(lng1 / step) + 2):
        lng = i * step + (h(i) - 0.5) * step * 0.3
        major = i % 6 == 0
        g.line([P(lat0, lng), P(lat1, lng)], fill='#fcd6a4' if major else '#ffffff', width=w_minor * (2 if major else 1))
    for j in range(int(lat0 / step) - 1, int(lat1 / step) + 2):
        lat = j * step + (h(j + 99991) - 0.5) * step * 0.3
        major = j % 6 == 0
        g.line([P(lat, lng0), P(lat, lng1)], fill='#fcd6a4' if major else '#ffffff', width=w_minor * (2 if major else 1))
    # EDSA
    pts = [P(a, b) for a, b in EDSA]
    ew = max(3, int((z - 10) * 2.2)) * S
    g.line(pts, fill='#e892a2', width=ew + 2 * S, joint='curve')
    g.line(pts, fill='#f9b29c', width=ew, joint='curve')
    im = im.resize((256, 256), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'PNG'); return buf.getvalue()

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            z, x, y = self.path.strip('/').split('?')[0].replace('.png', '').split('/')[-3:]
            body = tile(int(z), int(x), int(y))
            self.send_response(200); self.send_header('Content-Type', 'image/png'); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers(); self.wfile.write(body)
        except Exception as e:
            self.send_response(500); self.end_headers(); self.wfile.write(str(e).encode())
    def log_message(self, *a): pass

ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
