/** Saved and recent places for the route planner, kept on the device. */
import type { LatLng } from './routing'

export interface SavedPlace extends LatLng {
  label: string
  detail?: string
}

export const PLACES_KEY = 'pamasahe-ph:places'
const MAX_RECENT = 10

interface Stored {
  saved: SavedPlace[]
  recent: SavedPlace[]
}

const same = (a: SavedPlace, b: SavedPlace) => a.label === b.label && Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1e-4

export function loadPlaces(): Stored {
  try {
    const v = JSON.parse(localStorage.getItem(PLACES_KEY) ?? 'null') as Stored | null
    if (v && Array.isArray(v.saved) && Array.isArray(v.recent)) return v
  } catch {
    /* fall through */
  }
  return { saved: [], recent: [] }
}

function store(v: Stored): Stored {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(v))
  } catch {
    /* storage full or blocked: keep in memory only */
  }
  return v
}

export function addRecent(p: SavedPlace): Stored {
  const v = loadPlaces()
  return store({ ...v, recent: [p, ...v.recent.filter((x) => !same(x, p))].slice(0, MAX_RECENT) })
}

export function toggleSaved(p: SavedPlace): Stored {
  const v = loadPlaces()
  const has = v.saved.some((x) => same(x, p))
  return store({ ...v, saved: has ? v.saved.filter((x) => !same(x, p)) : [p, ...v.saved] })
}

export const isSaved = (v: Stored, p: SavedPlace) => v.saved.some((x) => same(x, p))
