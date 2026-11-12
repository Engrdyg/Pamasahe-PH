/** Saved commutes (e.g. Home → Work), kept on the device. Re-planned with the
 *  current data each time they are opened; saving reserves nothing. */
import type { SavedPlace } from './places'

export interface Commute {
  id: string
  from: SavedPlace
  to: SavedPlace
  savedAt: number
}

export const COMMUTES_KEY = 'pamasahe-ph:commutes'
const MAX = 8
const near = (a: SavedPlace, b: SavedPlace) => Math.abs(a.lat - b.lat) < 2e-4 && Math.abs(a.lng - b.lng) < 2e-4

export function loadCommutes(): Commute[] {
  try {
    const v = JSON.parse(localStorage.getItem(COMMUTES_KEY) ?? '[]') as Commute[]
    return Array.isArray(v) ? v.filter((c) => c?.from && c?.to) : []
  } catch {
    return []
  }
}

function store(list: Commute[]): Commute[] {
  try {
    if (list.length) localStorage.setItem(COMMUTES_KEY, JSON.stringify(list))
    else localStorage.removeItem(COMMUTES_KEY)
  } catch {
    /* storage blocked */
  }
  return list
}

export const findCommute = (list: Commute[], from: SavedPlace, to: SavedPlace) => list.find((c) => near(c.from, from) && near(c.to, to))

export function saveCommute(from: SavedPlace, to: SavedPlace, now = Date.now()): Commute[] {
  const list = loadCommutes().filter((c) => !(near(c.from, from) && near(c.to, to)))
  return store([{ id: now.toString(36), from, to, savedAt: now }, ...list].slice(0, MAX))
}

export const removeCommute = (id: string): Commute[] => store(loadCommutes().filter((c) => c.id !== id))
export const clearCommutes = (): Commute[] => store([])
