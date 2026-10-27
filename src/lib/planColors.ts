import type { LineKind, LineMeta } from './planner'

/** Colour per kind of ride (mode filter chips). */
export const KIND_COLOR: Record<LineKind, string> = { jeep: '#0b3d91', uv: '#7c3aed', rail: '#16a34a', busway: '#dc2626' }

// Rail lines keep their official colours; the Busway is red.
const LINE_COLOR: Record<string, string> = { 'lrt-1': '#16a34a', 'lrt-2': '#7c3aed', 'mrt-3': '#2563eb', 'edsa-busway': '#dc2626' }
// Road rides get distinct colours in order, so two jeep rides never look alike.
const ROAD_PALETTE = ['#ea580c', '#db2777', '#0891b2', '#1e3a8a', '#ca8a04']

/** One colour per ride of an itinerary, used by the map, the legend and the option chips. */
export function rideColors(lines: Pick<LineMeta, 'modeId' | 'kind'>[]): string[] {
  let road = 0
  const used = new Set<string>()
  return lines.map((l) => {
    let c = LINE_COLOR[l.modeId]
    if (!c) {
      c = ROAD_PALETTE[road++ % ROAD_PALETTE.length]
      // Avoid clashing with a rail colour already on this trip
      while (used.has(c) && road < ROAD_PALETTE.length * 2) c = ROAD_PALETTE[road++ % ROAD_PALETTE.length]
    }
    used.add(c)
    return c
  })
}
