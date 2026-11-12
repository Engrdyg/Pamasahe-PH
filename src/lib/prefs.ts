/** Small typed wrapper around localStorage for device preferences (FR-3, §7). */
import type { Lang } from '../engine/types'
import type { Theme } from './theme'

/** Passenger type. Students, seniors and PWD get the discounted fare the
 *  fare guides publish (one "Student / Senior / PWD" column per mode). */
export type Passenger = 'regular' | 'student' | 'senior' | 'pwd'
export const PASSENGERS: Passenger[] = ['regular', 'student', 'senior', 'pwd']

export interface Prefs {
  /** Legacy switch (before passenger types); still read for migration. */
  discount: boolean
  passenger: Passenger | null
  lang: Lang
  theme: Theme
  lastMode: string | null
  lastCategory: string | null
  dismissedUpdate: string | null
  installDismissed: boolean
  /** Route-planner ranking preference. */
  planRank: string | null
}

const KEY = 'pamasahe-ph:prefs'
const defaults: Prefs = { discount: false, passenger: null, lang: 'en', theme: 'system', lastMode: null, lastCategory: null, dismissedUpdate: null, installDismissed: false, planRank: null }

function readAll(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

export function getPref<K extends keyof Prefs>(key: K, fallback: Prefs[K] = defaults[key]): Prefs[K] {
  const v = readAll()[key]
  return v == null ? fallback : v
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [key]: value }))
  } catch {
    /* storage unavailable (private mode); preferences just don't persist */
  }
}
