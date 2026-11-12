import { beforeEach, describe, expect, it } from 'vitest'
import { addFix, gapKm, haversineMeters, loadRide, rideKm, rideMinutes, saveRide, startRide, type RidePoint } from '../ride'

const fix = (lat: number, lng: number, t: number, acc = 10): RidePoint => ({ lat, lng, t, acc })

describe('ride tracking', () => {
  beforeEach(() => localStorage.clear())

  it('measures distance along EDSA roughly right', () => {
    // SM North EDSA -> Ayala, straight line ≈ 11.7 km
    const d = haversineMeters({ lat: 14.6566, lng: 121.0303 }, { lat: 14.5497, lng: 121.0290 })
    expect(d).toBeGreaterThan(11500)
    expect(d).toBeLessThan(12000)
  })

  it('accumulates movement and ignores standing-still jitter', () => {
    let s = startRide(0)
    s = addFix(s, fix(14.6566, 121.0303, 0))
    // 3 m of jitter: ignored
    s = addFix(s, fix(14.65663, 121.0303, 1000))
    expect(s.meters).toBe(0)
    // ~110 m south in 10 s (40 km/h): accepted
    s = addFix(s, fix(14.6556, 121.0303, 11000))
    expect(s.meters).toBeGreaterThan(100)
    expect(s.points).toHaveLength(2)
  })

  it('rejects inaccurate fixes and impossible jumps', () => {
    let s = startRide(0)
    s = addFix(s, fix(14.6566, 121.0303, 0, 500)) // too inaccurate to start
    expect(s.points).toHaveLength(0)
    s = addFix(s, fix(14.6566, 121.0303, 1000))
    s = addFix(s, fix(14.6556, 121.0303, 2000, 200)) // inaccurate
    expect(s.meters).toBe(0)
    s = addFix(s, fix(14.5497, 121.029, 3000)) // 11.7 km in 2 s: teleport
    expect(s.meters).toBe(0)
  })

  it('reports km to one decimal and minutes from the clock', () => {
    let s = startRide(0)
    // ~1.22 km in 2 minutes, a fix every 20 s
    for (let i = 0; i <= 6; i++) s = addFix(s, fix(14.6566 - (0.011 * i) / 6, 121.0303, i * 20000))
    expect(rideKm(s)).toBe(1.2)
    expect(rideMinutes(s, 150000)).toBe(2.5)
    expect(rideMinutes({ ...s, endedAt: 60000 })).toBe(1)
  })

  it('persists and restores a ride', () => {
    const s = addFix(startRide(5), fix(14.6, 121, 5))
    saveRide(s)
    expect(loadRide()).toEqual(s)
    saveRide(null)
    expect(loadRide()).toBeNull()
  })
})

describe('GPS gaps', () => {
  it('keeps distance across a long silence apart from measured distance', () => {
    const p = (lat: number, t: number): RidePoint => ({ lat, lng: 121.03, t, acc: 10 })
    let r = startRide(0)
    r = addFix(r, p(14.6, 0))
    r = addFix(r, p(14.601, 10_000)) // ~111 m in 10 s: measured
    r = addFix(r, p(14.611, 120_000)) // ~1.1 km after 110 s without fixes: gap
    expect(Math.round(r.meters)).toBe(111)
    expect(r.gaps).toBe(1)
    expect(Math.round(r.gapMeters!)).toBe(1112)
    expect(rideKm(r)).toBe(0.1)
    expect(gapKm(r)).toBe(1.1)
  })
})
