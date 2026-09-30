import type { Lang, Localized } from '../engine/types'

export const localized = (l: Localized | undefined, lang: string): string =>
  l ? (l[lang as Lang] ?? l.en) : ''

export const fmtPct = (pct: number): string => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`

export const fmtKm = (km: number): string => (Number.isInteger(km) ? `${km}` : km.toFixed(1))

export function formatEffective(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(lang === 'fil' ? 'fil-PH' : 'en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
