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

Music: see below.

## Music

`beat.mp3` is an original 15 s loop generated with the ElevenLabs sound-effects
API ("budots dance beat, 128 BPM, jeepney sound system", loop on). `music.m4a`
is that loop played twice with a fade-out, normalised to −14 LUFS:

```bash
ffmpeg -stream_loop 1 -i beat.mp3 -t 30 -af "afade=t=in:d=0.05,afade=t=out:st=28.8:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k music.m4a
ffmpeg -i silent.mp4 -i music.m4a -map 0:v -map 1:a -c copy -shortest -movflags +faststart ../magkano-pamasahe-tiktok-v2.mp4
```
