import { beforeEach, describe, expect, it } from 'vitest'
import { buildReport, overcharge, parseAmount } from '../report'
import { loadTrip, saveTrip, tripTotals, type TripLeg } from '../trip'

describe('overcharge report', () => {
  it('parses amounts typed in many ways', () => {
    expect(parseAmount('300')).toBe(30000)
    expect(parseAmount('₱1,234.50')).toBe(123450)
    expect(parseAmount(' 50.5 ')).toBe(5050)
    expect(parseAmount('')).toBeNaN()
    expect(parseAmount('0')).toBeNaN()
    expect(parseAmount('abc')).toBeNaN()
  })
  it('computes the overcharge', () => {
    expect(overcharge(24000, 30000)).toEqual({ amount: 6000, pct: 25 })
  })
  it('builds a complete complaint text', () => {
    const text = buildReport({
      modeName: 'Regular Taxi', tripLabel: '10 km, 20 min', official: 24000, officialLabel: 'regular',
      charged: 30000, plate: 'abc 1234', place: 'NAIA T3 to Makati', notes: '', when: new Date(2026, 9, 27, 20, 42),
      source: 'LTFRB Sep 28, 2026', lang: 'en',
    })
    expect(text).toContain('Overcharge report')
    expect(text).toContain('Vehicle: Regular Taxi')
    expect(text).toContain('Plate / body no.: ABC 1234')
    expect(text).toContain('Fare charged: ₱300.00')
    expect(text).toContain('Official fare: ₱240.00 (regular)')
    expect(text).toContain('Overcharge: ₱60.00 (+25.0%)')
    expect(text).not.toContain('Notes:')
  })
})

describe('trip legs', () => {
  beforeEach(() => localStorage.clear())
  const leg = (r: number, d: number): TripLeg => ({ id: String(r), modeName: 'x', tripLabel: 'y', regular: r, discounted: d, source: 's', addedAt: 0 })
  it('totals legs and persists them', () => {
    const legs = [leg(1400, 1125), leg(1200, 960), leg(1800, 1450)]
    expect(tripTotals(legs)).toEqual({ regular: 4400, discounted: 3535 })
    saveTrip(legs)
    expect(loadTrip()).toEqual(legs)
    saveTrip([])
    expect(loadTrip()).toEqual([])
  })
})
