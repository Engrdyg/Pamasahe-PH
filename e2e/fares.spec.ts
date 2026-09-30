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
