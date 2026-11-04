import { chromium } from '../../node_modules/@playwright/test/index.mjs'
const times = process.argv.slice(3).map(Number), out = process.argv[2]
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--allow-file-access-from-files'] })
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
p.on('pageerror', (e) => console.log('ERR', e.message))
p.on('console', (m) => m.type() === 'error' && console.log('console', m.text()))
await p.goto('file://' + process.cwd() + '/story.html')
await p.waitForTimeout(1500)
for (const t of times) { await p.evaluate((t) => window.seek(t), t); await p.screenshot({ path: `${out}/f-${t}.png`, type: 'jpeg', quality: 80 }) }
await b.close()
