/** Bundled baseline fare data. The service worker and the updater in
 *  src/lib/updater.ts can replace this at runtime with a newer manifest. */
import type { Manifest, Mode } from '../engine/types'
import manifestJson from '../../fares/manifest.json'

const files = import.meta.glob<{ default: Mode }>('../../fares/*.json', { eager: true })

export const bundledManifest = manifestJson as Manifest

export const bundledModes: Mode[] = bundledManifest.modes.map((id) => {
  const entry = files[`../../fares/${id}.json`]
  if (!entry) throw new Error(`fare data file missing for mode "${id}"`)
  return entry.default
})

export const modesById: Record<string, Mode> = Object.fromEntries(bundledModes.map((m) => [m.id, m]))
