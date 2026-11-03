import { describe, expect, it } from 'vitest'
import { bundledModes } from '../../data'
import { categoryFrom, rateSummary } from '../rates'

const byId = Object.fromEntries(bundledModes.map((m) => [m.id, m]))
// Echo the key and values so the test does not depend on the wording.
const t = (k: string, o: Record<string, unknown> = {}) => `${k} ${Object.values(o).join(' ')}`.trim()

describe('rate summaries', () => {
  it('describes add-on fares with the base distance and the per-km add-on', () => {
    expect(rateSummary(byId['pub-city-ordinary'], false, t)).toBe('rate.addOn ₱15.00 5 ₱2.49')
    expect(rateSummary(byId['puj-traditional'], true, t)).toBe('rate.addOn ₱11.20 4 ₱1.60')
  })
  it('describes per-km, taxi, TNVS and matrix fares', () => {
    expect(rateSummary(byId['uv-traditional'], false, t)).toBe('rate.perKm ₱2.60')
    expect(rateSummary(byId['taxi-regular'], false, t)).toBe('rate.taxi ₱65.00 ₱13.50 ₱2.00')
    expect(rateSummary(byId['tnvs'], false, t)).toBe('rate.tnvs ₱55.00 ₱165.00')
    expect(rateSummary(byId['edsa-busway'], false, t)).toBe('rate.matrix ₱18.00')
  })
  it('picks the cheapest mode in a category for the tile', () => {
    expect(categoryFrom('bus-city', bundledModes, false, t)).toBe('rate.fromAddOn ₱15.00 5')
    expect(categoryFrom('jeepney', bundledModes, false, t)).toBe('rate.fromAddOn ₱14.00 4')
  })
})
