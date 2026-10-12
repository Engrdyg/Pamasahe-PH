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
  })
})

describe('rail station coordinates', () => {
  for (const id of ['mrt-3', 'lrt-2', 'lrt-1']) {
    it(`${id}: every station has a coordinate inside Metro Manila and is its own nearest`, () => {
      const mode = modesById[id] as MatrixMode
      const pts = stationPoints(mode)
      const stations = mode.directions['single-journey'].stations
      expect(pts.filter((p) => p.direction === 'single-journey')).toHaveLength(stations.length)
      for (const p of pts) {
        expect(p.lat).toBeGreaterThan(14.4)
        expect(p.lat).toBeLessThan(14.8)
        expect(p.lng).toBeGreaterThan(120.9)
        expect(p.lng).toBeLessThan(121.2)
        expect(nearestStation(pts, p)?.station.name).toBe(p.name)
      }
    })
  }
  it('resolves well-known spots to the right station', () => {
    expect(nearestStation(stationPoints(modesById['mrt-3'] as MatrixMode), { lat: 14.5495, lng: 121.0285 })?.station.name).toBe('Ayala')
    expect(nearestStation(stationPoints(modesById['lrt-2'] as MatrixMode), { lat: 14.6225, lng: 121.0528 })?.station.name).toBe('Araneta Center-Cubao')
    expect(nearestStation(stationPoints(modesById['lrt-1'] as MatrixMode), { lat: 14.5385, lng: 120.9995 })?.station.name).toBe('EDSA')
  })
})
