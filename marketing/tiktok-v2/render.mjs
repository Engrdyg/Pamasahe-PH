// Renders story.html to an H.264 MP4 (1080×1920, 30 fps, 30 s).
// Usage (from this folder): node render.mjs <ffmpeg> <out.mp4>
import { chromium } from '../../node_modules/@playwright/test/index.mjs'
import { spawn } from 'node:child_process'
const [ffmpeg, out] = process.argv.slice(2)
const FPS = 30, DUR = 30
const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-vcodec', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] })
ff.on('exit', (code) => { if (code) { console.error(`ffmpeg exited with ${code}`); process.exit(1) } })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
await page.goto('file://' + process.cwd() + '/story.html')
await page.waitForTimeout(1500)
const n = FPS * DUR
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => window.seek(t), i / FPS)
  const buf = await page.screenshot({ type: 'jpeg', quality: 94 })
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
  if (i % 150 === 0) console.log(`frame ${i}/${n}`)
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
await browser.close()
console.log('done')
