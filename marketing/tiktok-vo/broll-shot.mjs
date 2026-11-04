import { chromium } from '../../node_modules/@playwright/test/index.mjs'
const out = process.argv[2]
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--allow-file-access-from-files'] })
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
p.on('pageerror', (e) => console.log('ERR', e.message))
await p.goto('file://' + process.cwd() + '/broll-test.html')
await p.waitForTimeout(800)
for (const s of ['track', 'front', 'aerial', 'wheel', 'rear']) {
  await p.evaluate(([s]) => window.shot(2, s, 0.5), [s])
  await p.screenshot({ path: `${out}/b-${s}.jpg`, type: 'jpeg', quality: 80 })
}
await b.close()
