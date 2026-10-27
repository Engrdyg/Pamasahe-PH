import { describe, expect, it, vi } from 'vitest'
import { landmarkNear, placeFromFeature, searchPlaces } from '../geocode'

const feature = (props: Record<string, string>, lng = 121.03, lat = 14.65) => ({
  geometry: { coordinates: [lng, lat] as [number, number] },
  properties: props,
})

describe('geocode', () => {
  it('builds a label and detail from a Photon feature', () => {
    expect(placeFromFeature(feature({ name: 'SM North EDSA', city: 'Quezon City', state: 'Metro Manila' }))).toEqual({
      label: 'SM North EDSA',
      detail: 'Quezon City, Metro Manila',
      lat: 14.65,
      lng: 121.03,
    })
    expect(placeFromFeature(feature({ street: 'EDSA', housenumber: '12', city: 'Makati' }))).toMatchObject({ label: '12 EDSA', detail: 'EDSA, Makati' })
    expect(placeFromFeature(feature({}))).toBeNull()
  })
  it('skips short queries, biases to the Philippines, and de-duplicates', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      expect(url).toContain('bbox=116.9')
      expect(url).toContain('q=Ayala')
      return {
        ok: true,
        json: async () => ({
          features: [
            feature({ name: 'Ayala', city: 'Makati' }),
            feature({ name: 'Ayala', city: 'Makati' }, 121.031, 14.551),
            feature({ name: 'Ayala Avenue', city: 'Makati' }),
          ],
        }),
      } as Response
    })
    expect(await searchPlaces('Ay', null, fetchFn as unknown as typeof fetch)).toEqual([])
    expect(fetchFn).not.toHaveBeenCalled()
    const res = await searchPlaces('Ayala', { lat: 14.5, lng: 121 }, fetchFn as unknown as typeof fetch)
    expect(res.map((p) => p.label)).toEqual(['Ayala', 'Ayala Avenue'])
  })
})

describe('landmarkNear', () => {
  const feature = (name: string | undefined, osm_key: string, extra: Record<string, string> = {}) => ({
    geometry: { coordinates: [120.98, 14.6] },
    properties: { name, osm_key, ...extra },
  })
  const fake = (features: unknown[]) => (async () => new Response(JSON.stringify({ features }))) as unknown as typeof fetch

  it('prefers a named landmark, with its street', async () => {
    const f = fake([feature('Quezon Boulevard', 'highway'), feature('Quiapo Church', 'amenity', { street: 'Plaza Miranda' })])
    expect(await landmarkNear({ lat: 14.5987, lng: 120.9837 }, f)).toBe('Quiapo Church (Plaza Miranda)')
  })
  it('falls back to the street name', async () => {
    expect(await landmarkNear({ lat: 14.61, lng: 121.0 }, fake([feature('Aurora Boulevard', 'highway')]))).toBe('Aurora Boulevard')
  })
  it('returns null when the request fails', async () => {
    const f = (async () => { throw new Error('offline') }) as unknown as typeof fetch
    expect(await landmarkNear({ lat: 14.62, lng: 121.01 }, f)).toBeNull()
  })
})
