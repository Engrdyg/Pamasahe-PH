# TikTok promo, 60 s (1080×1920, 30 fps, with music)

The 60-second cut for **Bayad Po**: hook, brand, route planner (search, results,
landmarks, colours and legend, pins), fares (jeep, discount, Busway, rail),
GPS ride tracker, trip total, overcharge report, end card.

`story.html` is the whole video: `window.seek(t)` positions every element for
time `t`. App screens in `shots/` are captures of the real app (Filipino UI)
with stand-in map tiles (`tiles.py`) and stand-in place / landmark names,
because OpenStreetMap and Photon are not reachable from the render machine.

```bash
# from the repo root
npm run build && npx vite preview --port 4193 &
cd marketing/tiktok-60s
python3 tiles.py 4199 &
node capture.mjs http://localhost:4193 http://localhost:4199
../../node_modules/.bin/esbuild jeep3d-entry.ts --bundle --format=iife --minify --outfile=jeep3d.js
node preview.mjs /tmp 1.5 15.5 35 58.5                   # spot-check frames
FF=<path to a full ffmpeg build with libx264>
node render.mjs $FF silent.mp4
$FF -stream_loop 3 -i beat.mp3 -t 60 -af "afade=t=in:d=0.05,afade=t=out:st=57.5:d=2.5,loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k music.m4a
$FF -i silent.mp4 -i music.m4a -map 0:v -map 1:a -c copy -shortest -movflags +faststart ../bayad-po-tiktok-60s.mp4
```

Music: `beat.mp3`, an original 15 s budots loop generated with the ElevenLabs
sound-effects API, played four times with a fade-out.
