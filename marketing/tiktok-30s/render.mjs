import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
const dir = process.argv[2], ffmpeg = process.argv[3], out = process.argv[4]
const FPS = 30, DUR = 30
const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-vcodec', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
await page.goto(`file://${dir}/story.html`)
await page.waitForTimeout(300)
const n = FPS * DUR
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => window.seek(t), i / FPS)
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 })
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
  if (i % 150 === 0) console.log(`frame ${i}/${n}`)
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
await browser.close()
console.log('done')
