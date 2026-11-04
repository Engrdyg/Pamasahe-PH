# TikTok video with 3D b-roll and sound effects (60 s, 1080×1920)

- **B-roll:** `broll.js` (bundled from `broll-entry.ts`): the app's patok
  jeepney driving down a generated city street at golden hour, with five camera
  moves (front, tracking, aerial, wheel close-up, rear). Spins the wheels via
  `userData.wheel` tags in `src/hero3d/jeepney.ts`.
- **Zooms:** push-ins on the b-roll, punch-in on every return to the phone,
  and zooms onto the fare, the map legend, the GPS distance and the total.
- **Captions:** word-by-word, the newest word highlighted (`CAPS` in
  `story.html`).
- **Sound effects:** generated with the ElevenLabs sound-effects API
  (`sfx.json` → `sfx/*.mp3`): whoosh on cuts and slides, pop on text, click on
  taps, ka-ching on fares, boom on the brand, stamp, ding, typing, jeepney horn
  and engine. `window.CUES` in `story.html` lists every cue; `render.mjs`
  writes them to `cues.json` and `mix.py` lays them over the music.
- **No voice-over.** The free ElevenLabs plan only offers voices with a
  foreign accent; Filipino library voices need a paid plan.
- App screens are the captures in `../tiktok-60s/shots` (stand-in map tiles
  and place names).

```bash
cd marketing/tiktok-vo
../../node_modules/.bin/esbuild broll-entry.ts --bundle --format=iife --minify --outfile=broll.js
../../node_modules/.bin/esbuild jeep3d-entry.ts --bundle --format=iife --minify --outfile=jeep3d.js
node render.mjs <ffmpeg with libx264> silent.mp4     # also writes cues.json
python3 mix.py <ffmpeg> silent.mp4 ../bayad-po-tiktok-broll.mp4
```
