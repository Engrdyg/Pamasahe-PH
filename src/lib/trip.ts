/** Multi-leg trip (e.g. jeep → MRT-3 → bus): legs are snapshots of fare cards. */
import { distanceFare } from '../engine'
import type { Centavos, Mode } from '../engine/types'
import type { Passenger } from './prefs'

/** How the fare of a leg was worked out. */
export type FareBasis = 'distance' | 'matrix' | 'metered' | 'planner'
/** Where the distance of a distance-based leg came from. */
export type InputSource = 'manual' | 'road' | 'gps' | 'route'

export interface TripLeg {
  id: string
  modeName: string
  tripLabel: string
  regular: Centavos
  discounted: Centavos
  source: string
  addedAt: number
  /** Snapshot of the calculation (absent on legs saved before v2026.11). */
  modeId?: string
  basis?: FareBasis
  km?: number
  inputSource?: InputSource
  /** Fare-data version and the mode's effective date when the leg was saved. */
  fareVersion?: string
  effective?: string
  /** Passenger type shown when the leg was saved ('discounted' on older legs). */
  passenger?: Passenger | 'discounted'
}

export const TRIP_KEY = 'pamasahe-ph:trip'

export function loadTrip(): TripLeg[] {
  try {
    const raw = localStorage.getItem(TRIP_KEY)
    const legs = raw ? (JSON.parse(raw) as TripLeg[]) : []
    return Array.isArray(legs) ? legs.filter((l) => Number.isFinite(l.regular) && Number.isFinite(l.discounted)) : []
  } catch {
    return []
  }
}

export function saveTrip(legs: TripLeg[]): void {
  try {
    if (legs.length) localStorage.setItem(TRIP_KEY, JSON.stringify(legs))
    else localStorage.removeItem(TRIP_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function tripTotals(legs: TripLeg[]): { regular: Centavos; discounted: Centavos } {
  return legs.reduce((a, l) => ({ regular: a.regular + l.regular, discounted: a.discounted + l.discounted }), { regular: 0, discounted: 0 })
}

let seq = 0
export function newLegId(now = Date.now()): string {
  seq += 1
  return `${now.toString(36)}-${seq}`
}

/** Fare data for this leg has changed since it was saved. */
export function isStale(leg: TripLeg, version: string, modesById: Record<string, Mode>): boolean {
  if (!leg.fareVersion || leg.fareVersion === version) return false
  const m = leg.modeId ? modesById[leg.modeId] : undefined
  return !m || m.effective !== leg.effective
}

/** A distance-based leg re-priced for a new distance with current data, or null. */
export function editLegKm(leg: TripLeg, km: number, modesById: Record<string, Mode>): Partial<TripLeg> | null {
  if (!(km > 0)) return null
  const f = recalcLeg({ ...leg, km }, modesById)
  if (!f) return null
  const m = modesById[leg.modeId!]
  return { ...f, km, inputSource: 'manual', tripLabel: `${Math.round(km * 10) / 10} km`, effective: m.effective }
}

/** Current fare for a saved distance-based leg, or null when it cannot be
 *  recomputed from the snapshot (station, metered and planner legs). */
export function recalcLeg(leg: TripLeg, modesById: Record<string, Mode>): { regular: Centavos; discounted: Centavos } | null {
  const m = leg.modeId ? modesById[leg.modeId] : undefined
  if (!m || leg.basis !== 'distance' || leg.km == null || (m.method !== 'ADD_ON' && m.method !== 'PER_KM')) return null
  try {
    const f = distanceFare(m, leg.km)
    return { regular: f.regular, discounted: f.discounted }
  } catch {
    return null
  }
}
