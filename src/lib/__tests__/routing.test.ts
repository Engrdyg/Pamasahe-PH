import { describe, expect, it, vi } from 'vitest'
import { fetchRoute } from '../routing'

describe('fetchRoute', () => {
  it('parses an OSRM response into km, minutes and [lat,lng] geometry', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      expect(url).toContain('/route/v1/driving/121.03,14.55;121,14.66?')
      return {
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [{ distance: 12345, duration: 1500, geometry: { coordinates: [[121.03, 14.55], [121.0, 14.66]] } }],
        }),
      } as Response
    })
    const r = await fetchRoute({ lat: 14.55, lng: 121.03 }, { lat: 14.66, lng: 121.0 }, fetchFn as unknown as typeof fetch)
    expect(r).toEqual({ km: 12.3, minutes: 25, geometry: [[14.55, 121.03], [14.66, 121.0]] })
  })
  it('throws on HTTP or routing errors', async () => {
    const bad = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response)
    await expect(fetchRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, bad as unknown as typeof fetch)).rejects.toThrow('503')
    const noRoute = vi.fn(async () => ({ ok: true, json: async () => ({ code: 'NoRoute' }) }) as Response)
    await expect(fetchRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, noRoute as unknown as typeof fetch)).rejects.toThrow('NoRoute')
  })
})
