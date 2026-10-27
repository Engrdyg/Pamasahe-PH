/** Multi-leg trip (e.g. jeep → MRT-3 → bus): legs are snapshots of fare cards. */
import type { Centavos } from '../engine/types'

export interface TripLeg {
  id: string
  modeName: string
  tripLabel: string
  regular: Centavos
  discounted: Centavos
  source: string
  addedAt: number
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
