/**
 * Route planner over the NCR jeepney / UV Express network plus rail and the
 * EDSA Busway, in the spirit of Sakay.ph: walk to a stop, ride, transfer up to
 * twice, walk to the destination.
 *
 * Every line is resampled every ~SAMPLE_M metres (rail and Busway use their
 * stations). A RAPTOR-style search runs one round per ride: in each round, the
 * best cost (minutes) to board at every sample is swept along its line to get
 * the best cost to alight at every other sample, then short walks to other
 * lines seed the next round. Jeepney and UV lines can be ridden in either
 * direction (the data has one direction per route); Busway lines are one-way.
 * Fares come from the fare engine, not from the search.
 */
import { distanceFare, matrixFare, type Centavos, type DistanceMode, type MatrixMode, type Mode } from '../engine'
import type { LatLng } from './routing'

export interface RouteFile {
  source: string
  routes: {
    id: number
    name: string
    mode: string
    altMode?: string
    code: string
    km: number
    mc?: string
    remarks?: string
    lines: [number, number][][]
  }[]
}

export type LineKind = 'jeep' | 'uv' | 'rail' | 'busway'

export interface Line {
  /** Display name: route name, or rail line / Busway direction. */
  name: string
  kind: LineKind
  modeId: string
  altModeId?: string
  mc?: string
  oneWay: boolean
  /** Matrix direction key (rail ticket type or Busway direction). */
  direction?: string
  /** Station names for rail / Busway samples. */
  stations?: string[]
  lat: number[]
  lng: number[]
  /** Distance along the line (m) at each sample. */
  s: number[]
}

export interface Network {
  lines: Line[]
  // Flattened samples for the spatial index
  first: Int32Array // first sample index of each line
  sx: Float64Array
  sy: Float64Array
  sLine: Int32Array
  grid: Map<number, number[]>
}

export const SAMPLE_M = 100
const CELL = 300
const WALK = 75 // m per minute (4.5 km/h)
const MAX_ACCESS = 700 // m walk to the first stop / from the last
const MAX_TRANSFER = 300 // m walk between lines
const DIRECT_WALK = 1500 // offer walking only when the trip is this short
const ROUNDS = 3 // rides (so up to 2 transfers)
const SPEED: Record<LineKind, number> = { jeep: 230, uv: 320, rail: 500, busway: 380 } // m per minute
const WAIT: Record<LineKind, number> = { jeep: 4, uv: 7, rail: 5, busway: 5 }
const TRANSFER_PENALTY = 3
const MIN_RIDE: Record<LineKind, number> = { jeep: 700, uv: 1000, rail: 0, busway: 0 } // shorter rides are not worth it
const FASTEST = Math.max(...Object.values({ jeep: 230, uv: 320, rail: 500, busway: 380 }))

const LAT0 = 14.6
const KX = 111320 * Math.cos((LAT0 * Math.PI) / 180)
const KY = 110540
const px = (lng: number) => (lng - 121) * KX
const py = (lat: number) => (lat - LAT0) * KY
const cellKey = (x: number, y: number) => Math.floor(x / CELL) * 100000 + Math.floor(y / CELL)

function resample(pts: [number, number][]): { lat: number[]; lng: number[]; s: number[] } {
  const lat: number[] = [pts[0][0]]
  const lng: number[] = [pts[0][1]]
  const s: number[] = [0]
  let along = 0
  let next = SAMPLE_M
  for (let i = 1; i < pts.length; i++) {
    const [aLat, aLng] = pts[i - 1]
    const [bLat, bLng] = pts[i]
    const seg = Math.hypot(px(bLng) - px(aLng), py(bLat) - py(aLat))
    while (seg > 0 && next <= along + seg) {
      const t = (next - along) / seg
      lat.push(aLat + (bLat - aLat) * t)
      lng.push(aLng + (bLng - aLng) * t)
      s.push(next)
      next += SAMPLE_M
    }
    along += seg
  }
  if (along - s[s.length - 1] > 1) {
    lat.push(pts[pts.length - 1][0])
    lng.push(pts[pts.length - 1][1])
    s.push(along)
  }
  return { lat, lng, s }
}

function stationLine(name: string, kind: LineKind, mode: MatrixMode, direction: string, oneWay: boolean): Line | null {
  const d = mode.directions[direction]
  if (!d?.stationInfo) return null
  const lat: number[] = []
  const lng: number[] = []
  const s: number[] = []
  const stations: string[] = []
  d.stations.forEach((st, i) => {
    const info = d.stationInfo![i]
    if (!info) return
    if (s.length) s.push(s[s.length - 1] + Math.hypot(px(info.lng) - px(lng[lng.length - 1]), py(info.lat) - py(lat[lat.length - 1])))
    else s.push(0)
    lat.push(info.lat)
    lng.push(info.lng)
    stations.push(st)
  })
  return lat.length > 1 ? { name, kind, modeId: mode.id, oneWay, direction, stations, lat, lng, s } : null
}

export function buildNetwork(file: RouteFile, modesById: Record<string, Mode>): Network {
  const lines: Line[] = []
  for (const r of file.routes) {
    const kind: LineKind = r.mode.startsWith('uv') ? 'uv' : 'jeep'
    for (const pts of r.lines) {
      if (pts.length < 2) continue
      lines.push({ name: r.name, kind, modeId: r.mode, altModeId: r.altMode, mc: r.mc, oneWay: false, ...resample(pts) })
    }
  }
  for (const id of ['lrt-1', 'lrt-2', 'mrt-3']) {
    const m = modesById[id] as MatrixMode | undefined
    if (m?.method !== 'MATRIX') continue
    const l = stationLine(m.name.en, 'rail', m, 'single-journey', false)
    if (l) lines.push(l)
  }
  const bw = modesById['edsa-busway'] as MatrixMode | undefined
  if (bw?.method === 'MATRIX') {
    for (const dir of Object.keys(bw.directions)) {
      const l = stationLine('EDSA Busway', 'busway', bw, dir, true)
      if (l) lines.push(l)
    }
  }
  const total = lines.reduce((n, l) => n + l.s.length, 0)
  const first = new Int32Array(lines.length + 1)
  const sx = new Float64Array(total)
  const sy = new Float64Array(total)
  const sLine = new Int32Array(total)
  const grid = new Map<number, number[]>()
  let g = 0
  lines.forEach((l, li) => {
    first[li] = g
    for (let i = 0; i < l.s.length; i++, g++) {
      sx[g] = px(l.lng[i])
      sy[g] = py(l.lat[i])
      sLine[g] = li
      const k = cellKey(sx[g], sy[g])
      const cell = grid.get(k)
      if (cell) cell.push(g)
      else grid.set(k, [g])
    }
  })
  first[lines.length] = g
  return { lines, first, sx, sy, sLine, grid }
}

/** Samples within `radius` metres of (x, y), with their distance. */
function near(net: Network, x: number, y: number, radius: number, out: (g: number, d: number) => void) {
  const r = Math.ceil(radius / CELL)
  const cx = Math.floor(x / CELL)
  const cy = Math.floor(y / CELL)
  for (let i = cx - r; i <= cx + r; i++) {
    for (let j = cy - r; j <= cy + r; j++) {
      const cell = net.grid.get(i * 100000 + j)
      if (!cell) continue
      for (const g of cell) {
        const d = Math.hypot(net.sx[g] - x, net.sy[g] - y)
        if (d <= radius) out(g, d)
      }
    }
  }
}

export interface WalkLeg {
  type: 'walk'
  meters: number
  minutes: number
  from: LatLng
  to: LatLng
}
export interface RideLeg {
  type: 'ride'
  line: Line
  from: number // sample index on the line
  to: number
  meters: number
  minutes: number
  /** Station names for rail / Busway. */
  fromStation?: string
  toStation?: string
  path: LatLng[]
  regular: Centavos | null
  discounted: Centavos | null
  /** e.g. modern jeep fare when the route allows both */
  alt?: { modeId: string; regular: Centavos; discounted: Centavos }
}
export type Leg = WalkLeg | RideLeg

export interface Itinerary {
  legs: Leg[]
  minutes: number
  rides: number
  walkMeters: number
  regular: Centavos
  discounted: Centavos
  /** true when some leg's fare could not be computed */
  fareIncomplete: boolean
}

const pt = (l: Line, i: number): LatLng => ({ lat: l.lat[i], lng: l.lng[i] })

function legFare(line: Line, from: number, to: number, meters: number, modesById: Record<string, Mode>): Pick<RideLeg, 'regular' | 'discounted' | 'alt' | 'fromStation' | 'toStation'> {
  const mode = modesById[line.modeId]
  try {
    if (line.stations && mode?.method === 'MATRIX') {
      const a = line.stations[from]
      const b = line.stations[to]
      const f = matrixFare(mode, line.direction!, a, b)
      return { regular: f.regular, discounted: f.discounted, fromStation: a, toStation: b }
    }
    if (mode && (mode.method === 'ADD_ON' || mode.method === 'PER_KM')) {
      const km = Math.max(0.1, meters / 1000)
      const f = distanceFare(mode as DistanceMode, km)
      const altMode = line.altModeId ? modesById[line.altModeId] : undefined
      const alt =
        altMode && (altMode.method === 'ADD_ON' || altMode.method === 'PER_KM')
          ? (() => {
              const a = distanceFare(altMode as DistanceMode, km)
              return { modeId: altMode.id, regular: a.regular, discounted: a.discounted }
            })()
          : undefined
      return { regular: f.regular, discounted: f.discounted, alt }
    }
  } catch {
    /* fall through */
  }
  return { regular: null, discounted: null }
}

/**
 * Plan trips from `a` to `b`. Returns up to `max` itineraries: the best for
 * each number of rides, plus other direct routes, sorted by time.
 */
export function plan(net: Network, modesById: Record<string, Mode>, a: LatLng, b: LatLng, max = 5, exclude: LineKind[] = []): Itinerary[] {
  const skip = new Set(exclude)
  const allowed = (g: number) => !skip.has(net.lines[net.sLine[g]].kind)
  const N = net.sx.length
  const ax = px(a.lng), ay = py(a.lat), bx = px(b.lng), by = py(b.lat)
  const direct = Math.hypot(bx - ax, by - ay)

  // Walk-to-destination cost from each sample near b
  const egress = new Map<number, number>()
  near(net, bx, by, MAX_ACCESS, (g, d) => egress.set(g, d))

  type Round = { board: Float64Array; boardPrev: Int32Array; boardWalk: Float64Array; ride: Float64Array; rideFrom: Int32Array }
  const rounds: Round[] = []
  let seeds = new Map<number, { cost: number; prev: number; walk: number }>()
  near(net, ax, ay, MAX_ACCESS, (g, d) => {
    if (!allowed(g)) return
    const cost = d / WALK + WAIT[net.lines[net.sLine[g]].kind]
    const cur = seeds.get(g)
    if (!cur || cost < cur.cost) seeds.set(g, { cost, prev: -1, walk: d })
  })

  let bestTotal = Infinity
  const finals: { round: number; g: number; total: number }[] = []

  for (let k = 0; k < ROUNDS && seeds.size; k++) {
    const R: Round = {
      board: new Float64Array(N).fill(Infinity),
      boardPrev: new Int32Array(N).fill(-2),
      boardWalk: new Float64Array(N),
      ride: new Float64Array(N).fill(Infinity),
      rideFrom: new Int32Array(N).fill(-1),
    }
    const touched = new Set<number>()
    for (const [g, s] of seeds) {
      if (s.cost < R.board[g]) {
        R.board[g] = s.cost
        R.boardPrev[g] = s.prev
        R.boardWalk[g] = s.walk
        touched.add(net.sLine[g])
      }
    }
    // Sweep each touched line in both directions (forward only when one-way).
    for (const li of touched) {
      const l = net.lines[li]
      const f0 = net.first[li]
      const n = l.s.length
      const v = SPEED[l.kind]
      let best = Infinity, arg = -1
      for (let i = 0; i < n; i++) {
        const g = f0 + i
        const c = R.board[g] - l.s[i] / v
        if (c < best) { best = c; arg = g }
        const ride = best + l.s[i] / v
        if (arg !== g && ride < R.ride[g]) { R.ride[g] = ride; R.rideFrom[g] = arg }
      }
      if (!l.oneWay) {
        best = Infinity; arg = -1
        for (let i = n - 1; i >= 0; i--) {
          const g = f0 + i
          const c = R.board[g] + l.s[i] / v
          if (c < best) { best = c; arg = g }
          const ride = best - l.s[i] / v
          if (arg !== g && ride < R.ride[g]) { R.ride[g] = ride; R.rideFrom[g] = arg }
        }
      }
    }
    rounds.push(R)
    // Arrivals at the destination
    let roundBest: { g: number; total: number } | null = null
    const longEnough = (g: number) => {
      const li = net.sLine[g]
      const f0 = net.first[li]
      const l = net.lines[li]
      return R.rideFrom[g] >= 0 && Math.abs(l.s[g - f0] - l.s[R.rideFrom[g] - f0]) >= MIN_RIDE[l.kind]
    }
    for (const [g, d] of egress) {
      const total = R.ride[g] + d / WALK
      if (total < Infinity && longEnough(g) && (!roundBest || total < roundBest.total)) roundBest = { g, total }
    }
    if (roundBest) {
      finals.push({ round: k, ...roundBest })
      bestTotal = Math.min(bestTotal, roundBest.total)
    }
    // Transfers seed the next round
    const next = new Map<number, { cost: number; prev: number; walk: number }>()
    if (k + 1 < ROUNDS) {
      for (const li of touched) {
        const l = net.lines[li]
        const f0 = net.first[li]
        for (let g = f0; g < net.first[li + 1]; g++) {
          const c = R.ride[g]
          // A*-style bound: even the fastest mode in a straight line can't beat the best so far
          if (!(c + Math.max(0, Math.hypot(net.sx[g] - bx, net.sy[g] - by) - MAX_ACCESS) / FASTEST < bestTotal)) continue
          if (R.rideFrom[g] >= 0 && Math.abs(l.s[g - f0] - l.s[R.rideFrom[g] - f0]) < MIN_RIDE[l.kind]) continue
          near(net, net.sx[g], net.sy[g], MAX_TRANSFER, (h, d) => {
            if (net.sLine[h] === li || !allowed(h)) return
            const cost = c + d / WALK + WAIT[net.lines[net.sLine[h]].kind] + TRANSFER_PENALTY
            if (cost >= bestTotal) return
            const cur = next.get(h)
            if (!cur || cost < cur.cost) next.set(h, { cost, prev: g, walk: d })
          })
        }
      }
    }
    seeds = next
  }

  // Other direct (single-ride) options: best per line
  const directByLine = new Map<number, { g: number; total: number }>()
  if (rounds[0]) {
    for (const [g, d] of egress) {
      const total = rounds[0].ride[g] + d / WALK
      if (!(total < Infinity)) continue
      const li = net.sLine[g]
      const cur = directByLine.get(li)
      if (!cur || total < cur.total) directByLine.set(li, { g, total })
    }
  }

  const build = (round: number, g: number): Itinerary => {
    const legs: Leg[] = []
    let cur = g
    let last: LatLng = b
    for (let k = round; k >= 0; k--) {
      const R = rounds[k]
      const from = R.rideFrom[cur]
      const li = net.sLine[cur]
      const line = net.lines[li]
      const i = from - net.first[li]
      const j = cur - net.first[li]
      const meters = Math.abs(line.s[j] - line.s[i])
      const path: LatLng[] = []
      for (let x = i; x !== j + Math.sign(j - i); x += Math.sign(j - i) || 1) path.push(pt(line, x))
      const end = pt(line, j)
      const toLast = Math.hypot(px(last.lng) - px(end.lng), py(last.lat) - py(end.lat))
      if (toLast > 15) legs.unshift({ type: 'walk', meters: toLast, minutes: toLast / WALK, from: end, to: last })
      legs.unshift({
        type: 'ride',
        line,
        from: i,
        to: j,
        meters,
        minutes: meters / SPEED[line.kind] + WAIT[line.kind],
        path,
        ...legFare(line, i, j, meters, modesById),
      })
      last = pt(line, i)
      const prev = R.boardPrev[from]
      if (prev < 0 || k === 0) break
      cur = prev
    }
    const start = Math.hypot(px(last.lng) - ax, py(last.lat) - ay)
    if (start > 15) legs.unshift({ type: 'walk', meters: start, minutes: start / WALK, from: a, to: last })
    let regular = 0, discounted = 0, incomplete = false, walkMeters = 0, minutes = 0
    for (const l of legs) {
      minutes += l.minutes
      if (l.type === 'walk') walkMeters += l.meters
      else if (l.regular == null || l.discounted == null) incomplete = true
      else { regular += l.regular; discounted += l.discounted }
    }
    return { legs, minutes, rides: legs.filter((l) => l.type === 'ride').length, walkMeters, regular, discounted, fareIncomplete: incomplete }
  }

  const out: Itinerary[] = []
  const key = (it: Itinerary) => it.legs.filter((l): l is RideLeg => l.type === 'ride').map((l) => `${l.line.name}|${l.line.direction ?? ''}`).join('>')
  const seen = new Set<string>()
  const push = (it: Itinerary) => {
    const k = key(it)
    if (seen.has(k)) return
    seen.add(k)
    out.push(it)
  }
  for (const f of finals) push(build(f.round, f.g))
  ;[...directByLine.values()].sort((x, y) => x.total - y.total).slice(0, 3).forEach((d) => push(build(0, d.g)))
  // Keep an option only if it is not much slower than the best, and an option
  // with more rides only if it saves real time over every option with fewer.
  const fastest = Math.min(...out.map((o) => o.minutes))
  const kept = out
    .filter((o) => o.minutes <= fastest * 1.6 + 10)
    .filter((o) => out.every((p) => p === o || p.rides >= o.rides || o.minutes < p.minutes - 5))
    .filter((o) => !o.legs.some((l) => l.type === 'ride' && l.meters < MIN_RIDE[l.line.kind]))
    .sort((x, y) => x.minutes - y.minutes)
    .slice(0, max)
  if (direct <= DIRECT_WALK) {
    kept.push({ legs: [{ type: 'walk', meters: direct * 1.25, minutes: (direct * 1.25) / WALK, from: a, to: b }], minutes: (direct * 1.25) / WALK, rides: 0, walkMeters: direct * 1.25, regular: 0, discounted: 0, fareIncomplete: false })
    kept.sort((x, y) => x.minutes - y.minutes)
  }
  return kept
}

/** Line metadata without the sample arrays (what the UI needs). */
export type LineMeta = Pick<Line, 'name' | 'kind' | 'modeId' | 'altModeId' | 'mc' | 'direction'>
export type SlimLeg = WalkLeg | (Omit<RideLeg, 'line'> & { line: LineMeta })
export type SlimItinerary = Omit<Itinerary, 'legs'> & { legs: SlimLeg[] }

export function slim(it: Itinerary): SlimItinerary {
  return {
    ...it,
    legs: it.legs.map((l) =>
      l.type === 'walk'
        ? l
        : { ...l, line: { name: l.line.name, kind: l.line.kind, modeId: l.line.modeId, altModeId: l.line.altModeId, mc: l.line.mc, direction: l.line.direction } },
    ),
  }
}
