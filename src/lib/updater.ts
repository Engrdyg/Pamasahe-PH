/** FR-16: on launch, when online, check fares/manifest.json for a newer data
 *  version. Newer data is stored in localStorage and used on the next render. */
import type { Manifest, Mode } from '../engine/types'
import { bundledManifest, bundledModes } from '../data'

const KEY = 'pamasahe-ph:fares'

interface Stored {
  manifest: Manifest
  modes: Mode[]
}

export function isNewer(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { numeric: true }) > 0
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Stored
    return s.manifest && Array.isArray(s.modes) ? s : null
  } catch {
    return null
  }
}

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
    localStorage.setItem(KEY, JSON.stringify({ manifest, modes } satisfies Stored))
    return manifest
  } catch {
    return null
  }
}
