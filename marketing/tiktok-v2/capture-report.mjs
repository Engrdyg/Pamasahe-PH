import { chromium } from '../../node_modules/@playwright/test/index.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const [app] = process.argv.slice(2)
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
await c.addInitScript(() => localStorage.setItem('pamasahe-ph:prefs', JSON.stringify({ lang: 'fil', theme: 'light', installDismissed: true })))
const p = await c.newPage()
await p.goto(app + '/#/calc/jeepney')
await p.getByLabel('Distansya (km)', { exact: true }).fill('12')
await p.getByTestId('report-open').click()
await p.getByTestId('report-charged').fill('40')
await p.getByTestId('report-plate').fill('PUJ 1234')
await p.getByTestId('report-panel').evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 70))
await p.waitForTimeout(400)
await p.screenshot({ path: 'shots/report.png' })
const boxes = JSON.parse(readFileSync('shots/boxes.json', 'utf8'))
boxes.report = { over: await p.getByTestId('report-over').boundingBox(), panel: await p.getByTestId('report-panel').boundingBox() }
writeFileSync('shots/boxes.json', JSON.stringify(boxes, null, 1))
await b.close()
