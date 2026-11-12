import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bundledManifest } from '../../data'
import { PREV_KEY, checkForUpdate, isNewer, loadFareData, loadPreviousFareData } from '../updater'

const json = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as unknown as Response

describe('updater', () => {
  beforeEach(() => localStorage.clear())

  it('compares versions numerically', () => {
    expect(isNewer('2026.09.28-2', '2026.09.28-1')).toBe(true)
    expect(isNewer('2026.10.01-1', '2026.09.28-10')).toBe(true)
    expect(isNewer('2026.09.28-1', '2026.09.28-1')).toBe(false)
  })

  it('uses bundled data when nothing newer is stored', () => {
    expect(loadFareData().manifest.version).toBe(bundledManifest.version)
  })

  it('ignores manifests that are not newer', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(bundledManifest))
    expect(await checkForUpdate('/fares/', fetchFn)).toBeNull()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('fetches, stores and serves newer data', async () => {
    const manifest = { ...bundledManifest, version: '2027.01.01-1', effective: '2027-01-01', modes: ['puj-traditional'] }
    const mode = { id: 'puj-traditional', name: { en: 'Jeep', fil: 'Jeep' }, method: 'PER_KM', effective: '2027-01-01', source: 'LTFRB', rounding: 0.25, regular: { perKm: 9 }, discounted: { perKm: 7.2 } }
    const fetchFn = vi.fn(async (url: string) =>
      url.endsWith('manifest.json') ? json(manifest) : json(mode),
    )
    const result = await checkForUpdate('/fares/', fetchFn as unknown as typeof fetch)
    expect(result?.version).toBe('2027.01.01-1')
    const data = loadFareData()
    expect(data.manifest.version).toBe('2027.01.01-1')
    expect(data.modes).toHaveLength(1)
  })

  it('keeps old data if a mode file fails to download', async () => {
    const manifest = { ...bundledManifest, version: '2027.01.01-1', modes: ['puj-traditional'] }
    const fetchFn = vi.fn(async (url: string) =>
      url.endsWith('manifest.json') ? json(manifest) : json({}, false),
    )
    expect(await checkForUpdate('/fares/', fetchFn as unknown as typeof fetch)).toBeNull()
    expect(loadFareData().manifest.version).toBe(bundledManifest.version)
  })

  it('rejects an update whose mode data is incomplete, keeping valid data', async () => {
    const manifest = { ...bundledManifest, version: '2027.01.01-1', modes: ['puj-traditional'] }
    const broken = { id: 'puj-traditional', method: 'PER_KM', regular: { perKm: 9 } } // no discounted rate, source or date
    const fetchFn = vi.fn(async (url: string) => (url.endsWith('manifest.json') ? json(manifest) : json(broken)))
    expect(await checkForUpdate('/fares/', fetchFn as unknown as typeof fetch)).toBeNull()
    expect(loadFareData().manifest.version).toBe(bundledManifest.version)
  })

  it('keeps the replaced data set for recovery', async () => {
    const mk = (v: string) => ({
      manifest: { ...bundledManifest, version: v, modes: ['puj-traditional'] },
      mode: { id: 'puj-traditional', name: { en: 'Jeep', fil: 'Jeep' }, method: 'PER_KM', effective: '2027-01-01', source: 'LTFRB', rounding: 0.25, regular: { perKm: 9 }, discounted: { perKm: 7.2 } },
    })
    for (const v of ['2027.01.01-1', '2027.02.01-1']) {
      const { manifest, mode } = mk(v)
      await checkForUpdate('/fares/', vi.fn(async (url: string) => (url.endsWith('manifest.json') ? json(manifest) : json(mode))) as unknown as typeof fetch)
    }
    expect(loadFareData().manifest.version).toBe('2027.02.01-1')
    expect(loadPreviousFareData()?.manifest.version).toBe('2027.01.01-1')
    // A corrupted store falls back to the bundled data instead of breaking the app.
    localStorage.setItem('pamasahe-ph:fares', '{"manifest":{"version":"9999"},"modes":[{}]}')
    expect(loadFareData().manifest.version).toBe(bundledManifest.version)
    expect(localStorage.getItem(PREV_KEY)).toBeTruthy()
  })
})
