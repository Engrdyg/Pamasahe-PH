import { beforeEach, describe, expect, it } from 'vitest'
import { buildReport, overcharge, parseAmount } from '../report'
import { isStale, loadTrip, recalcLeg, saveTrip, tripTotals, type TripLeg } from '../trip'
import { modesById } from '../../data'

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
    expect(text).toContain('Fare report (draft)')
    expect(text).toContain('Vehicle: Regular Taxi')
    expect(text).toContain('Plate / body no.: ABC 1234')
    expect(text).toContain('Fare charged: ₱300.00')
    expect(text).toContain('Official fare: ₱240.00 (regular)')
    expect(text).toContain('Fare difference: ₱60.00 (+25.0%)')
    expect(text).not.toContain('Notes:')
  })
  it('marks estimate-based differences as possible and names the basis', () => {
    const text = buildReport({
      modeName: 'Jeepney', tripLabel: '6 km', official: 1600, officialLabel: 'regular', charged: 2000,
      when: new Date(Date.UTC(2026, 10, 12, 1, 5)), source: 'LTFRB Sep 28, 2026', lang: 'en', basis: 'Distance-based fare', estimated: true,
    })
    expect(text).toContain('Possible fare difference: ₱4.00 (+25.0%)')
    expect(text).toContain('Fare basis: Distance-based fare')
    expect(text).toContain('estimate')
    // Report times are in Philippine time whatever the phone's zone.
    expect(text).toContain('Nov 12, 2026, 9:05')
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

describe('trip fare snapshots', () => {
  const base: TripLeg = {
    id: 'a', modeName: 'Jeepney', tripLabel: '12 km', regular: 2750, discounted: 2200, source: 'LTFRB', addedAt: 0,
    modeId: 'puj-traditional', basis: 'distance', km: 12, fareVersion: '2025.01.01-1', effective: '2025-01-01',
  }
  it('flags legs saved with older fare data and recomputes the current fare', () => {
    expect(isStale(base, '2026.09.28-1', modesById)).toBe(true)
    expect(recalcLeg(base, modesById)).toEqual({ regular: 3000, discounted: 2400 })
  })
  it('does not flag legs from the current data or without a snapshot', () => {
    expect(isStale({ ...base, fareVersion: '2026.09.28-1' }, '2026.09.28-1', modesById)).toBe(false)
    expect(isStale({ ...base, fareVersion: undefined }, '2026.09.28-1', modesById)).toBe(false)
    // A newer data version that leaves this mode's rates alone is not a change for this leg.
    expect(isStale({ ...base, effective: '2026-09-28' }, '2026.10.01-1', modesById)).toBe(false)
  })
  it('only recomputes distance-based legs', () => {
    expect(recalcLeg({ ...base, basis: 'matrix' }, modesById)).toBeNull()
  })
})
