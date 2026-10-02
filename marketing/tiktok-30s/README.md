# TikTok promo (30 s, 1080×1920, no voice-over)

`story.html` is the whole video: a deterministic timeline where `window.seek(t)`
positions every element for time `t` (seconds). Edit the copy, timings or
screenshots there, then re-render:

```bash
# from the repo root; needs ffmpeg on PATH (or pass a path as the 2nd arg)
node marketing/tiktok-30s/render.mjs "$PWD/marketing/tiktok-30s" ffmpeg marketing/magkano-pamasahe-tiktok.mp4
```

Screenshots (`s-*.png`) are 3× captures of the live app. The video has no
audio; add a trending sound in TikTok.
