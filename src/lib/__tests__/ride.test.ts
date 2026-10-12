import { beforeEach, describe, expect, it } from 'vitest'
import { addFix, haversineMeters, loadRide, rideKm, rideMinutes, saveRide, startRide, type RidePoint } from '../ride'

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
    s = addFix(s, fix(14.6566, 121.0303, 0))
    s = addFix(s, fix(14.6456, 121.0303, 120000)) // ~1.22 km
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
