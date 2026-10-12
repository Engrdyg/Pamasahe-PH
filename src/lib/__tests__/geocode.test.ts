import { describe, expect, it, vi } from 'vitest'
import { placeFromFeature, searchPlaces } from '../geocode'

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
