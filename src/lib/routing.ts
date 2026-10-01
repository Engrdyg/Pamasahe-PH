/** Road routing via the public OSRM demo server (driving profile). */
export interface LatLng {
  lat: number
  lng: number
}
export interface RouteResult {
  km: number
  minutes: number
  /** [lat, lng] pairs of the route geometry */
  geometry: [number, number][]
}

export const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

interface OsrmResponse {
  code: string
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[]
}

export async function fetchRoute(a: LatLng, b: LatLng, fetchFn: typeof fetch = fetch): Promise<RouteResult> {
  const url = `${OSRM_BASE}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`OSRM ${res.status}`)
  const data = (await res.json()) as OsrmResponse
  const r = data.routes?.[0]
  if (data.code !== 'Ok' || !r) throw new Error(`OSRM ${data.code}`)
  return {
    km: Math.round(r.distance / 100) / 10,
    minutes: Math.max(1, Math.round(r.duration / 60)),
    geometry: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  }
}

/** Default view: Metro Manila. */
export const DEFAULT_CENTER: LatLng = { lat: 14.6, lng: 121.02 }
