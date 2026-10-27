// Captures every app state used in the 60 s video from a local preview
// (vite preview) at 390×844 @3x, Filipino UI, light theme.
// Usage: node capture.mjs <appUrl> <tileUrl>
// Map tiles come from tiles.py (OSM is unreachable from the render machine);
// place search and landmark names are stand-ins for Photon.
import { chromium } from '../../node_modules/@playwright/test/index.mjs'
import { writeFileSync } from 'node:fs'
const [app, tiles] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
const boxes = {}
// Stand-in landmark names near the demo trips (the app asks Photon / OpenStreetMap)
function landmark(lat, lng) {
  if (lng > 121.07) return ['Ortigas Avenue', 'highway', '']
  if (lng > 121.045 && lat < 14.6) return ['Shaw Boulevard', 'highway', '']
  if (lat < 14.607) return ['Quiapo Church', 'amenity', 'Quezon Boulevard']
  if (lat < 14.63) return ['Gateway Mall', 'shop', 'Aurora Boulevard']
  return ['Trinoma', 'shop', 'EDSA']
}
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
  await c.route('https://photon.komoot.io/reverse**', (r) => {
    const u = new URL(r.request().url())
    const lat = Number(u.searchParams.get('lat'))
    const lng = Number(u.searchParams.get('lon'))
    const [name, osm_key, street] = landmark(lat, lng)
    r.fulfill({ json: { features: [{ geometry: { coordinates: [lng, lat] }, properties: { name, osm_key, ...(street ? { street } : {}) } }] } })
  })
  await c.route('https://photon.komoot.io/api/**', (r) =>
    r.fulfill({
      json: {
        features: [
          { geometry: { coordinates: [120.9837, 14.5987] }, properties: { name: 'Quiapo Church', street: 'Quezon Boulevard', city: 'Manila' } },
          { geometry: { coordinates: [120.9842, 14.5995] }, properties: { name: 'Quiapo Market', city: 'Manila' } },
          { geometry: { coordinates: [120.9853, 14.5981] }, properties: { name: 'Plaza Miranda', city: 'Manila' } },
        ],
      },
    }),
  )
  return c
}
async function shot(page, name, targets = {}) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: `shots/${name}.png` })
  boxes[name] = {}
  for (const [k, loc] of Object.entries(targets)) boxes[name][k] = await loc.boundingBox()
  console.log('shot', name)
}
const km = (p) => p.getByLabel('Distansya (km)', { exact: true })

{ // Home and the route planner
  const c = await ctx(); const p = await c.newPage()
  await p.goto(app + '/')
  await p.waitForSelector('.hero-stage.is-ready', { timeout: 30000 })
  await p.waitForTimeout(1500)
  await shot(p, 'home', { search: p.getByTestId('plan-open') })
  await p.getByTestId('plan-open').click()
  await p.waitForSelector('[data-testid=plan-map]')
  await p.waitForTimeout(1500)
  await shot(p, 'plan-empty', { from: p.getByTestId('plan-from'), to: p.getByTestId('plan-to') })
  await p.getByTestId('plan-from').click()
  await shot(p, 'sheet-from', { input: p.getByTestId('sheet-input') })
  await p.getByTestId('sheet-input').fill('Quiapo')
  await p.waitForTimeout(900)
  const quiapo = p.getByTestId('sheet-place').filter({ hasText: 'Quiapo Church' }).first()
  await shot(p, 'sheet-quiapo', { pick: quiapo })
  await quiapo.click()
  await p.getByTestId('plan-to').click()
  await p.getByTestId('sheet-input').fill('Araneta')
  await p.waitForTimeout(700)
  const araneta = p.getByTestId('sheet-place').filter({ hasText: 'Araneta Center-Cubao (LRT-2)' }).first()
  await shot(p, 'sheet-araneta', { pick: araneta })
  await araneta.click()
  await p.waitForSelector('[data-testid=plan-option]', { timeout: 30000 })
  await p.waitForTimeout(2000)
  const opts = p.getByTestId('plan-option')
  const jeepIdx = await (async () => {
    for (let i = 0; i < (await opts.count()); i++) if (/Vito Cruz|Cubao/i.test((await opts.nth(i).textContent()) ?? '') && !/LRT-2/.test((await opts.nth(i).textContent()) ?? '')) return i
    return 1
  })()
  await shot(p, 'plan-results', { option1: opts.nth(jeepIdx), option0: opts.nth(0) })
  await opts.nth(jeepIdx).click()
  await p.waitForTimeout(1500)
  await shot(p, 'plan-jeep-map')
  await p.getByTestId('plan-steps').evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 150))
  await p.waitForTimeout(800)
  await shot(p, 'plan-jeep-steps', { add: p.getByTestId('plan-add') })
  await c.close()
}
{ // Multi-ride trip with the legend open; pin mode
  const c = await ctx(); const p = await c.newPage()
  await p.goto(app + '/#/plan/14.5764,121.0851/14.6539,121.0315')
  await p.waitForSelector('[data-testid=plan-option]', { timeout: 30000 })
  const opts = p.getByTestId('plan-option')
  for (let i = 0; i < (await opts.count()); i++) if (/lipat/.test((await opts.nth(i).textContent()) ?? '')) { await opts.nth(i).click(); break }
  await p.waitForTimeout(1500)
  await shot(p, 'plan-multi', { legend: p.getByTestId('map-legend').getByRole('button') })
  await p.getByTestId('map-legend').getByRole('button').click()
  await shot(p, 'plan-multi-legend')
  await p.goto(app + '/#/plan')
  await p.reload()
  await p.waitForTimeout(1200)
  await p.getByTestId('plan-from').click()
  await p.getByTestId('sheet-pin').click()
  await p.waitForTimeout(1800)
  await shot(p, 'plan-pin', { confirm: p.getByTestId('pin-confirm') })
  await c.close()
}
{ // Fares: jeep calculator, discount, report, busway, rail, trip
  const c = await ctx(); const p = await c.newPage()
  await p.goto(app + '/')
  await p.waitForSelector('.hero-stage.is-ready', { timeout: 30000 })
  await p.evaluate(() => document.getElementById('fares').scrollIntoView({ block: 'start' }))
  await p.evaluate(() => window.scrollBy(0, -70))
  await p.waitForTimeout(800)
  await shot(p, 'home-tiles', { jeep: p.getByTestId('tile-jeepney') })
  await p.getByTestId('tile-jeepney').click()
  await shot(p, 'jeep-empty', { km: km(p) })
  await km(p).fill('1'); await shot(p, 'jeep-1')
  await km(p).fill('12'); await p.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await shot(p, 'jeep-12', { km: km(p), primary: p.getByTestId('fare-primary') })
  const sw = p.getByRole('switch').first()
  await sw.click(); await shot(p, 'jeep-12-disc', { switch: sw, primary: p.getByTestId('fare-primary') })
  await sw.click()
  await p.getByTestId('trip-add').click()
  await p.goto(app + '/#/calc/busway')
  await p.locator('select').nth(0).selectOption('Monumento')
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
{ // Overcharge report
  const c = await ctx(); const p = await c.newPage()
  await p.goto(app + '/#/calc/jeepney')
  await km(p).fill('12')
  await p.getByTestId('report-open').click()
  await p.getByTestId('report-charged').fill('40')
  await p.getByTestId('report-plate').fill('PUJ 1234')
  await p.getByTestId('report-panel').evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 70))
  await shot(p, 'report', { over: p.getByTestId('report-over') })
  await c.close()
}
{ // Ride tracker along EDSA
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
      await shot(p, `ride-${i}`)
    }
  }
  await c.close()
}
writeFileSync('shots/boxes.json', JSON.stringify(boxes, null, 1))
await browser.close()
