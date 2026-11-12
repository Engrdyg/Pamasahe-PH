/** FR-16: on launch, when online, check fares/manifest.json for a newer data
 *  version. Newer data is stored in localStorage and used on the next render. */
import type { Manifest, Mode } from '../engine/types'
import { bundledManifest, bundledModes } from '../data'

const KEY = 'pamasahe-ph:fares'
/** The data set replaced by the last update, kept for recovery and to explain saved trips. */
export const PREV_KEY = 'pamasahe-ph:fares-prev'

interface Stored {
  manifest: Manifest
  modes: Mode[]
}

export function isNewer(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { numeric: true }) > 0
}

const isNum = (x: unknown) => typeof x === 'number' && Number.isFinite(x)

/** One internally consistent data set: every mode the manifest lists, once,
 *  each with the fields its fare method needs. Anything else is rejected so a
 *  broken or half-downloaded update can never replace working data. */
export function validFareData(manifest: Manifest, modes: Mode[]): boolean {
  if (!manifest || typeof manifest.version !== 'string' || !Array.isArray(manifest.modes) || !Array.isArray(modes)) return false
  if (modes.length !== manifest.modes.length) return false
  const byId = new Map(modes.map((m) => [m?.id, m]))
  if (byId.size !== modes.length) return false
  return manifest.modes.every((id) => {
    const m = byId.get(id)
    if (!m || typeof m.effective !== 'string' || typeof m.source !== 'string' || !m.name) return false
    if (m.status === 'pending_data') return true
    switch (m.method) {
      case 'ADD_ON':
        return isNum(m.regular?.baseFare) && isNum(m.regular?.baseKm) && isNum(m.regular?.perKm) && isNum(m.discounted?.baseFare) && isNum(m.rounding)
      case 'PER_KM':
        return isNum(m.regular?.perKm) && isNum(m.discounted?.perKm) && isNum(m.rounding)
      case 'METERED':
        return isNum(m.discountPct)
      case 'MATRIX':
        return !!m.directions && Object.values(m.directions).every((d) => Array.isArray(d.stations) && Array.isArray(d.regular) && d.regular.length === d.stations.length)
      default:
        return false
    }
  })
}

function readStored(key = KEY): Stored | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const s = JSON.parse(raw) as Stored
    return s.manifest && Array.isArray(s.modes) && validFareData(s.manifest, s.modes) ? s : null
  } catch {
    return null
  }
}

/** Data set that the last update replaced, if any. */
export const loadPreviousFareData = (): Stored | null => readStored(PREV_KEY)

/** Newest data available locally (stored update, else bundled). */
export function loadFareData(): Stored {
  const stored = readStored()
  if (stored && isNewer(stored.manifest.version, bundledManifest.version)) return stored
  return { manifest: bundledManifest, modes: bundledModes }
}

/** Returns the new manifest if an update was fetched and stored, else null. */
export async function checkForUpdate(base = `${import.meta.env.BASE_URL}fares/`, fetchFn: typeof fetch = fetch): Promise<Manifest | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  try {
    const current = loadFareData().manifest
    const res = await fetchFn(`${base}manifest.json`, { cache: 'no-cache' })
    if (!res.ok) return null
    const manifest = (await res.json()) as Manifest
    if (!manifest.version || !isNewer(manifest.version, current.version)) return null
    const modes = await Promise.all(
      manifest.modes.map(async (id) => {
        const r = await fetchFn(`${base}${id}.json`, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`failed to fetch ${id}`)
        return (await r.json()) as Mode
      }),
    )
    if (!validFareData(manifest, modes)) return null
    // Keep the data being replaced; write the new set in one step.
    const old = localStorage.getItem(KEY)
    if (old) localStorage.setItem(PREV_KEY, old)
    localStorage.setItem(KEY, JSON.stringify({ manifest, modes } satisfies Stored))
    return manifest
  } catch {
    return null
  }
}
