import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatPesos } from '../../engine'
import { bundledModes } from '../../data'
import { buildNetwork, plan, type RideLeg, type RouteFile } from '../planner'

const modesById = Object.fromEntries(bundledModes.map((m) => [m.id, m]))

describe('planner (synthetic network)', () => {
  // Two straight jeep routes crossing at (14.60, 121.00): one west–east, one south–north.
  const file: RouteFile = {
    source: 'test',
    routes: [
      { id: 1, name: 'West - East', mode: 'puj-traditional', code: 'TPUJ', km: 4.3, lines: [[[14.6, 120.98], [14.6, 121.02]]] },
      { id: 2, name: 'South - North', mode: 'puj-traditional', code: 'TPUJ', km: 4.4, lines: [[[14.58, 121.0], [14.62, 121.0]]] },
    ],
  }
  const net = buildNetwork(file, modesById)

  it('finds a direct ride along one route, in either direction', () => {
    const [best] = plan(net, modesById, { lat: 14.6003, lng: 121.015 }, { lat: 14.6003, lng: 120.985 })
    const rides = best.legs.filter((l): l is RideLeg => l.type === 'ride')
    expect(rides).toHaveLength(1)
    expect(rides[0].line.name).toBe('West - East')
    expect(rides[0].meters).toBeGreaterThan(3000)
    expect(formatPesos(best.regular)).toBe('₱14.00') // first 4 km
  })

  it('transfers where the routes cross', () => {
    const its = plan(net, modesById, { lat: 14.6, lng: 120.982 }, { lat: 14.618, lng: 121.0002 })
    const two = its.find((i) => i.rides === 2)!
    expect(two).toBeTruthy()
    const names = two.legs.filter((l): l is RideLeg => l.type === 'ride').map((l) => l.line.name)
    expect(names).toEqual(['West - East', 'South - North'])
    expect(two.regular).toBe(1400 + 1400)
  })

  it('offers walking for short trips and nothing when no route is near', () => {
    expect(plan(net, modesById, { lat: 14.6, lng: 121.005 }, { lat: 14.6, lng: 121.008 }).some((i) => i.rides === 0)).toBe(true)
    expect(plan(net, modesById, { lat: 14.7, lng: 121.1 }, { lat: 14.75, lng: 121.15 })).toEqual([])
  })
})

describe('planner (NCR data)', () => {
  const file = JSON.parse(readFileSync('public/routes/ncr.json', 'utf8')) as RouteFile
  const net = buildNetwork(file, modesById)

  it('plans Quiapo → Cubao with fares from the engine, quickly', () => {
    const t0 = performance.now()
    const its = plan(net, modesById, { lat: 14.5987, lng: 120.9837 }, { lat: 14.6197, lng: 121.0537 })
    const ms = performance.now() - t0
    expect(its.length).toBeGreaterThan(0)
    for (const it of its) {
      expect(it.regular).toBeGreaterThan(0)
      expect(it.fareIncomplete).toBe(false)
    }
    console.log(`${net.lines.length} lines, ${net.sx.length} samples, plan ${ms.toFixed(0)} ms`)
    for (const it of its)
      console.log(
        Math.round(it.minutes), 'min', formatPesos(it.regular), it.legs.map((l) => (l.type === 'walk' ? `walk ${Math.round(l.meters)}m` : `${l.line.name}${l.fromStation ? ` ${l.fromStation}→${l.toStation}` : ''} ${(l.meters / 1000).toFixed(1)}km`)).join(' | '),
      )
    expect(ms).toBeLessThan(1500)
  })

  it('uses rail when it is the natural choice (North Ave → Ayala along EDSA)', () => {
    const its = plan(net, modesById, { lat: 14.6525, lng: 121.0325 }, { lat: 14.5492, lng: 121.0277 })
    const kinds = its[0].legs.filter((l): l is RideLeg => l.type === 'ride').map((l) => l.line.kind)
    expect(kinds.some((k) => k === 'rail' || k === 'busway')).toBe(true)
  })
})
