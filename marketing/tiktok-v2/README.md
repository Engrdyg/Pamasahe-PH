# TikTok promo v2 (30 s, 1080×1920, no voice-over)

`story.html` is the whole video: `window.seek(t)` positions every element for
time `t` (seconds). App screens in `shots/` are real captures of the Filipino
UI; the spinning 3D jeepney is the app's own model (`jeep3d.js`, bundled from
`src/hero3d/jeepney.ts`).

```bash
# from the repo root
npm run build && npx vite preview --port 4182 &
cd marketing/tiktok-v2
python3 tiles.py 4199 &                                      # stand-in map tiles for the captures
node capture.mjs http://localhost:4182 http://localhost:4199 # app screenshots → shots/
node capture-report.mjs http://localhost:4182                # overcharge report screen
../../node_modules/.bin/esbuild jeep3d-entry.ts --bundle --format=iife --minify --outfile=jeep3d.js
node preview.mjs /tmp 1 9.6 29.5                             # spot-check frames
node render.mjs <path-to-ffmpeg> ../magkano-pamasahe-tiktok-v2.mp4
```

No audio; add a trending sound in TikTok.
