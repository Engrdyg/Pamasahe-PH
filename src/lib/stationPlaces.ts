/** Rail and Busway stations as offline place-search suggestions. */
import type { MatrixMode, Mode } from '../engine/types'
import type { SavedPlace } from './places'

export function stationPlaces(modesById: Record<string, Mode>, detail: string): SavedPlace[] {
  const out: SavedPlace[] = []
  for (const id of ['lrt-1', 'lrt-2', 'mrt-3', 'edsa-busway']) {
    const m = modesById[id] as MatrixMode | undefined
    if (m?.method !== 'MATRIX') continue
    const short = id === 'edsa-busway' ? 'EDSA Busway' : m.name.en
    const seen = new Set<string>()
    for (const d of Object.values(m.directions)) {
      d.stations.forEach((st, i) => {
        const info = d.stationInfo?.[i]
        if (!info || seen.has(st)) return
        seen.add(st)
        out.push({ label: `${st} (${short})`, detail, lat: info.lat, lng: info.lng })
      })
    }
  }
  return out
}
