/** Small typed wrapper around localStorage for device preferences (FR-3, §7). */
import type { Lang } from '../engine/types'

export interface Prefs {
  discount: boolean
  lang: Lang
  lastMode: string | null
  lastCategory: string | null
  dismissedUpdate: string | null
}

const KEY = 'pamasahe-ph:prefs'
const defaults: Prefs = { discount: false, lang: 'en', lastMode: null, lastCategory: null, dismissedUpdate: null }

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
