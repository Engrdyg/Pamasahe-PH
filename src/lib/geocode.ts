/** Place search (typeahead) via Photon, the OpenStreetMap-based geocoder by
 *  komoot. Free, no key; results are biased to the Philippines. */
import type { LatLng } from './routing'

export interface Place extends LatLng {
  label: string
  detail?: string
}

export const PHOTON_BASE = 'https://photon.komoot.io/api/'
// Philippines bounding box: minLon,minLat,maxLon,maxLat
const PH_BBOX = '116.9,4.5,126.7,21.2'

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    district?: string
    city?: string
    county?: string
    state?: string
    country?: string
    osm_key?: string
    osm_value?: string
  }
}

export function placeFromFeature(f: PhotonFeature): Place | null {
  const p = f.properties
  const [lng, lat] = f.geometry.coordinates
  const label = p.name ?? [p.housenumber, p.street].filter(Boolean).join(' ')
  if (!label) return null
  const detail = [p.street !== label ? p.street : null, p.district, p.city ?? p.county, p.state]
    .filter((x): x is string => Boolean(x) && x !== label)
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .join(', ')
  return { label, detail: detail || undefined, lat, lng }
}

export async function searchPlaces(
  query: string,
  near?: LatLng | null,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const params = new URLSearchParams({ q, limit: '6', lang: 'en', bbox: PH_BBOX })
  if (near) {
    params.set('lat', String(near.lat))
    params.set('lon', String(near.lng))
  }
  const res = await fetchFn(`${PHOTON_BASE}?${params}`, { signal })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const data = (await res.json()) as { features?: PhotonFeature[] }
  const seen = new Set<string>()
  const out: Place[] = []
  for (const f of data.features ?? []) {
    const place = placeFromFeature(f)
    if (!place) continue
    const key = `${place.label}|${place.detail ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(place)
  }
  return out
}

export const PHOTON_REVERSE = 'https://photon.komoot.io/reverse'

// Kinds of OSM objects that make good "get on at …" landmarks.
const LANDMARK_KEYS = new Set(['amenity', 'shop', 'tourism', 'leisure', 'public_transport', 'railway', 'building', 'office', 'historic', 'healthcare'])
const landmarkCache = new Map<string, Promise<string | null>>()

/**
 * Nearest named landmark or street to a point (Photon reverse geocoding), as a
 * short label like "Quiapo Church (Quezon Boulevard)". Cached per ~10 m.
 * Resolves to null when nothing useful is nearby or the request fails.
 */
export function landmarkNear(p: LatLng, fetchFn: typeof fetch = fetch): Promise<string | null> {
  const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
  const hit = landmarkCache.get(key)
  if (hit) return hit
  const params = new URLSearchParams({ lat: String(p.lat), lon: String(p.lng), limit: '8', radius: '0.15', lang: 'en' })
  const job = fetchFn(`${PHOTON_REVERSE}?${params}`)
    .then((res) => (res.ok ? (res.json() as Promise<{ features?: PhotonFeature[] }>) : { features: [] }))
    .then(({ features = [] }) => {
      const named = features.filter((f) => f.properties.name)
      const poi = named.find((f) => LANDMARK_KEYS.has(f.properties.osm_key ?? ''))
      const street = features.find((f) => f.properties.osm_key === 'highway' && f.properties.name)?.properties.name ?? features.find((f) => f.properties.street)?.properties.street
      if (poi) {
        const s = poi.properties.street ?? street
        return s && s !== poi.properties.name ? `${poi.properties.name} (${s})` : poi.properties.name!
      }
      return street ?? named[0]?.properties.name ?? null
    })
    .catch(() => null)
  landmarkCache.set(key, job)
  job.then((v) => v == null && landmarkCache.delete(key)) // retry later after a failure
  return job
}
