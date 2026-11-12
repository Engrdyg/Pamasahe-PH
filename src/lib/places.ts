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

export function clearPlaces(): Stored {
  try {
    localStorage.removeItem(PLACES_KEY)
  } catch {
    /* storage blocked */
  }
  return { saved: [], recent: [] }
}

/** The origin and destination being planned, shared by Home and the planner
 *  so either screen shows what was picked on the other. Memory only. */
export interface PlanDraft {
  from: SavedPlace | null
  to: SavedPlace | null
}
let draft: PlanDraft = { from: null, to: null }
export const getDraft = (): PlanDraft => draft
export function setDraft(d: Partial<PlanDraft>): PlanDraft {
  draft = { ...draft, ...d }
  return draft
}

/** Label of the drafted place at `p`, if any (within about 10 m). */
export function draftLabel(p: LatLng | null): string | null {
  if (!p) return null
  for (const x of [draft.from, draft.to])
    if (x && Math.abs(x.lat - p.lat) < 1e-4 && Math.abs(x.lng - p.lng) < 1e-4) return x.label
  return null
}

/** `#/plan/<from>/<to>`; a missing end is written as "-". */
export function planHref(from: LatLng | null, to: LatLng | null): string {
  const k = (p: LatLng | null) => (p ? `${p.lat.toFixed(5)},${p.lng.toFixed(5)}` : '-')
  return from || to ? `#/plan/${k(from)}/${k(to)}` : '#/plan'
}
