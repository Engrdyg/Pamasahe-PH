import { expect, test } from '@playwright/test'

test('jeep fare: traditional jeep 12 km shows ₱30.00 / ₱24.00', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('tile-jeepney').click()
  await page.getByLabel('Distance (km)', { exact: true }).fill('12')
  await expect(page.getByTestId('fare-primary')).toHaveText('₱30.00')
  await expect(page.getByTestId('fare-secondary')).toHaveText('₱24.00')
  await expect(page.getByTestId('fare-old')).toContainText('+₱2.50')
})

test('busway station pick: Monumento → PITX southbound = ₱85.00', async ({ page }) => {
  await page.goto('/#/calc/busway')
  await page.getByLabel('From').selectOption('Monumento')
  await page.getByLabel('To').selectOption('PITX')
  await expect(page.getByTestId('fare-primary')).toHaveText('₱85.00')
  await expect(page.getByTestId('fare-secondary')).toHaveText('₱67.75')
  // Direction is inferred: the reverse trip is northbound.
  await page.getByLabel('From').selectOption('PITX')
  await page.getByLabel('To').selectOption('Monumento')
  await expect(page.getByText('Direction: Northbound')).toBeVisible()
})

test('taxi breakdown: regular taxi 10 km, 20 min', async ({ page }) => {
  await page.goto('/#/calc/taxi')
  await page.getByLabel('Distance (km)', { exact: true }).fill('10')
  await page.getByLabel('Travel time (min)', { exact: true }).fill('20')
  const b = page.getByTestId('breakdown')
  await expect(b).toContainText('₱65.00')
  await expect(b).toContainText('₱135.00')
  await expect(b).toContainText('₱40.00')
  await expect(b).toContainText('₱240.00')
})

test('discount toggle is remembered across reloads', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('switch').click()
  await page.reload()
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
})

test('offline reload: app and fare data work without network', async ({ page, context }) => {
  await page.goto('/')
  // Wait for the service worker to activate and precache everything.
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready
    return Boolean(reg.active)
  })
  await page.waitForTimeout(1500)
  await context.setOffline(true)
  await page.goto('/#/calc/jeepney')
  await page.getByLabel('Distance (km)', { exact: true }).fill('12')
  await expect(page.getByTestId('fare-primary')).toHaveText('₱30.00')
  await page.reload()
  await page.getByLabel('Distance (km)', { exact: true }).fill('12')
  await expect(page.getByTestId('fare-primary')).toHaveText('₱30.00')
  await context.setOffline(false)
})

test('loading screen shows on launch and disappears once the app renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#splash')).toBeHidden({ timeout: 5000 })
  await expect(page.getByTestId('tile-jeepney')).toBeVisible()
})

test.describe('desktop layout', () => {
  test.use({ viewport: { width: 1280, height: 800 } })
  test('sidebar navigation replaces the tab bar and the calculator uses two columns', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('sidebar')).toBeVisible()
    await expect(page.locator('nav[aria-label="Main"] a', { hasText: 'Compare' })).toBeVisible()
    await page.getByTestId('tile-jeepney').click()
    await page.getByLabel('Distance (km)', { exact: true }).fill('12')
    await expect(page.getByTestId('fare-primary')).toHaveText('₱30.00')
    const input = await page.getByLabel('Distance (km)', { exact: true }).boundingBox()
    const card = await page.getByTestId('fare-card').boundingBox()
    expect(card!.x).toBeGreaterThan(input!.x + input!.width) // side by side, not stacked
    await page.getByTestId('map-open').click()
    await expect(page.getByTestId('route-picker')).toBeVisible()
  })
})

test.describe('trip planner (search)', () => {
  test.use({ serviceWorkers: 'block' })
  test('typing departure and arrival fills distance and time and shows the fare', async ({ page }) => {
    await page.route('https://photon.komoot.io/**', (r) => {
      const q = new URL(r.request().url()).searchParams.get('q') ?? ''
      const place = (name: string, lng: number, lat: number) => ({
        geometry: { coordinates: [lng, lat] },
        properties: { name, city: 'Quezon City', state: 'Metro Manila' },
      })
      r.fulfill({ json: { features: q.startsWith('SM North') ? [place('SM North EDSA', 121.03, 14.656)] : [place('Monumento', 120.984, 14.654)] } })
    })
    await page.route('https://router.project-osrm.org/**', (r) =>
      r.fulfill({ json: { code: 'Ok', routes: [{ distance: 11800, duration: 1860, geometry: { coordinates: [[121.03, 14.656], [120.984, 14.654]] } }] } }),
    )
    await page.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 204, body: '' }))
    await page.goto('/#/calc/taxi')
    await page.getByTestId('map-open').click()
    await page.getByTestId('place-from').fill('SM North EDSA')
    await page.getByRole('option', { name: /SM North EDSA/ }).click()
    await page.getByTestId('place-to').fill('Monumento')
    await page.getByRole('option', { name: /Monumento/ }).click()
    await expect(page.getByTestId('route-result')).toContainText('11.8 km')
    await expect(page.getByLabel('Distance (km)', { exact: true })).toHaveValue('11.8')
    await expect(page.getByLabel('Travel time (min)', { exact: true })).toHaveValue('31')
    // Regular taxi: 65 + 11.8 × 13.50 + 31 × 2 = 286.30
    await expect(page.getByTestId('fare-primary')).toHaveText('₱286.30')
  })
})

test.describe('ride tracker (GPS)', () => {
  test.use({ serviceWorkers: 'block', permissions: ['geolocation'], geolocation: { latitude: 14.6566, longitude: 121.0303, accuracy: 10 } })
  test('start, move along EDSA, end: distance and fare follow the ride', async ({ page, context }) => {
    await page.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 204, body: '' }))
    await page.goto('/#/calc/jeepney')
    await page.getByTestId('ride-open').click()
    await page.getByTestId('ride-start').click()
    await expect(page.getByTestId('ride-tracker')).toContainText(/Tracking/)
    // Drive south along EDSA at ~120 km/h in test time: 40 m every 1.2 s, 5 steps = 200 m.
    // (Faster jumps are rejected by the tracker as GPS teleports.)
    for (let i = 1; i <= 5; i++) {
      await page.waitForTimeout(1200)
      await context.setGeolocation({ latitude: 14.6566 - i * 0.00036, longitude: 121.0303, accuracy: 10 })
    }
    await expect(page.getByTestId('ride-km')).toContainText('0.2')
    await expect(page.getByLabel('Distance (km)', { exact: true })).toHaveValue('0.2')
    await expect(page.getByTestId('fare-primary')).toHaveText('₱14.00') // first 4 km
    await page.getByTestId('ride-stop').click()
    await expect(page.getByTestId('ride-tracker')).toContainText(/Ride ended/)
    await page.reload()
    // a finished ride is not resumed; an in-progress one would be
    await expect(page.getByTestId('ride-open')).toBeVisible()
  })
})
