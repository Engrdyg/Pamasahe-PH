// Captures app states for the video from a local preview (vite preview) at 390×844 @3x, Filipino UI.
// Usage: node capture.mjs <appUrl> <tileUrl>
import { chromium } from '../../node_modules/@playwright/test/index.mjs'
import { writeFileSync } from 'node:fs'
const [app, tiles] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
const boxes = {}
async function ctx(extra = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'fil-PH', ...extra })
  await c.addInitScript(() => {
    if (!localStorage.getItem('pamasahe-ph:prefs')) localStorage.setItem('pamasahe-ph:prefs', JSON.stringify({ lang: 'fil', theme: 'light', installDismissed: true }))
  })
  await c.route('https://tile.openstreetmap.org/**', async (r) => {
    const u = new URL(r.request().url())
    const res = await fetch(tiles + u.pathname)
    r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(await res.arrayBuffer()) })
  })
  return c
}
async function shot(page, name, targets = {}) {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `shots/${name}.png` })
  boxes[name] = {}
  for (const [k, loc] of Object.entries(targets)) boxes[name][k] = await loc.boundingBox()
  console.log('shot', name)
}
const km = (p) => p.getByLabel('Distansya (km)', { exact: true })

{ // Home, jeep calc, discount
  const c = await ctx(); const p = await c.newPage()
  await p.goto(app + '/')
  await p.waitForSelector('.hero-stage.is-ready', { timeout: 30000 })
  await p.waitForTimeout(1200)
  await shot(p, 'home', { jeep: p.getByTestId('tile-jeepney') })
  await p.getByTestId('tile-jeepney').click()
  await shot(p, 'jeep-empty', { km: km(p) })
  await km(p).fill('1'); await shot(p, 'jeep-1')
  await km(p).fill('12'); await p.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await shot(p, 'jeep-12', { km: km(p), card: p.getByTestId('fare-card'), primary: p.getByTestId('fare-primary') })
  const sw = p.getByRole('switch').first()
  boxes.switch = await sw.boundingBox()
  await sw.click(); await shot(p, 'jeep-12-disc', { switch: sw, primary: p.getByTestId('fare-primary') })
  await sw.click()
  // add to trip, then report overcharge
  await p.getByTestId('trip-add').click()
  await p.getByTestId('report-open').scrollIntoViewIfNeeded()
  await shot(p, 'jeep-report-btn', { report: p.getByTestId('report-open'), add: p.getByTestId('trip-add') })
  await p.getByTestId('report-open').click()
  await p.getByTestId('report-charged').fill('40')
  await p.getByTestId('report-plate').fill('PUJ 1234')
  await p.getByTestId('report-charged').scrollIntoViewIfNeeded()
  await p.evaluate(() => window.scrollBy(0, -120))
  await shot(p, 'report', { over: p.getByTestId('report-over') })
  // busway + rail legs
  await p.goto(app + '/#/calc/busway')
  await p.getByLabel('Mula').selectOption('Monumento').catch(async () => { await p.locator('select').nth(0).selectOption('Monumento') })
  await p.locator('select').nth(1).selectOption('Ayala')
  await shot(p, 'busway', { primary: p.getByTestId('fare-primary') })
  await p.getByTestId('trip-add').click()
  await p.goto(app + '/#/calc/rail')
  await p.getByRole('radio', { name: 'MRT-3' }).click()
  await p.locator('select').nth(0).selectOption('North Avenue')
  await p.locator('select').nth(1).selectOption('Ayala')
  await shot(p, 'rail', { primary: p.getByTestId('fare-primary') })
  await p.getByTestId('trip-add').click()
  await p.goto(app + '/#/trip')
  await shot(p, 'trip', { total: p.getByTestId('trip-total') })
  await c.close()
}
{ // Ride tracker along EDSA (North Ave → south)
  const c = await ctx({ permissions: ['geolocation'], geolocation: { latitude: 14.6566, longitude: 121.0303, accuracy: 8 } })
  const p = await c.newPage()
  await p.goto(app + '/#/calc/jeepney')
  await p.getByTestId('ride-open').click()
  await shot(p, 'ride-ready', { start: p.getByTestId('ride-start') })
  await p.getByTestId('ride-start').click()
  let lat = 14.6566
  for (let i = 1; i <= 24; i++) {
    await p.waitForTimeout(1100)
    lat -= 0.00036
    await c.setGeolocation({ latitude: lat, longitude: 121.0303 + i * 0.00002, accuracy: 8 })
    if (i === 4 || i === 14 || i === 24) {
      await p.getByTestId('ride-tracker').scrollIntoViewIfNeeded()
      await shot(p, `ride-${i}`, { km: p.getByTestId('ride-km') })
    }
  }
  await c.close()
}
writeFileSync('shots/boxes.json', JSON.stringify(boxes, null, 1))
await browser.close()
