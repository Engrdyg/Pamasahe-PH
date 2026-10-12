import { describe, expect, it } from 'vitest'
import { modesById } from '../../data'
import type { MatrixMode } from '../../engine/types'
import { nearestStation, stationPoints } from '../stations'

const busway = modesById['edsa-busway'] as MatrixMode

describe('station lookup', () => {
  it('lists every busway stop with coordinates in both directions', () => {
    const pts = stationPoints(busway)
    expect(pts).toHaveLength(24 + 23)
    expect(pts.filter((p) => p.name === 'Ayala')).toHaveLength(2)
  })
  it('finds the nearest stop', () => {
    const pts = stationPoints(busway)
    // Standing by MRT Ayala, Makati
    const n = nearestStation(pts, { lat: 14.5495, lng: 121.0285 })
    expect(n?.station.name).toBe('Ayala')
    expect(n!.meters).toBeLessThan(150)
    // Near Monumento, Caloocan
    expect(nearestStation(pts, { lat: 14.6572, lng: 120.9863 })?.station.name).toBe('Monumento')
  })
  it('returns null without station data', () => {
    expect(nearestStation([], { lat: 0, lng: 0 })).toBeNull()
    expect(stationPoints(modesById['mrt-3'] as MatrixMode)).toEqual([])
  })
})
