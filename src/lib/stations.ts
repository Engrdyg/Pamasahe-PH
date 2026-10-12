/** Station coordinates for MATRIX modes that carry map data (EDSA Busway). */
import type { MatrixMode } from '../engine/types'
import { haversineMeters } from './ride'
import type { LatLng } from './routing'

export interface StationPoint extends LatLng {
  name: string
  direction: string
}

/** Every station with coordinates, across all directions (a station served
 *  in both directions appears twice, possibly at slightly different spots). */
export function stationPoints(mode: MatrixMode): StationPoint[] {
  const out: StationPoint[] = []
  for (const [direction, d] of Object.entries(mode.directions)) {
    d.stationInfo?.forEach((info, i) => {
      if (info) out.push({ name: d.stations[i], lat: info.lat, lng: info.lng, direction })
    })
  }
  return out
}

export function nearestStation(points: StationPoint[], p: LatLng): { station: StationPoint; meters: number } | null {
  let best: { station: StationPoint; meters: number } | null = null
  for (const s of points) {
    const m = haversineMeters(s, p)
    if (!best || m < best.meters) best = { station: s, meters: m }
  }
  return best
}
