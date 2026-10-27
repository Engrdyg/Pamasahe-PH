/** Overcharge report: compare what was charged with the official fare and
 *  build a ready-to-send complaint text. */
import { formatPesos, toCentavos, type Centavos } from '../engine'

export interface ReportInput {
  modeName: string
  tripLabel: string
  official: Centavos
  officialLabel: string // "regular" or "Student / Senior / PWD"
  charged: Centavos
  plate?: string
  place?: string
  notes?: string
  when: Date
  source: string
  lang: 'en' | 'fil'
}

/** Parse "₱1,234.50", "300", "300.5" → centavos; NaN when not a positive amount. */
export function parseAmount(s: string): Centavos {
  const n = Number(s.replace(/[₱,\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? toCentavos(n) : Number.NaN
}

export function overcharge(official: Centavos, charged: Centavos): { amount: Centavos; pct: number } {
  const amount = charged - official
  return { amount, pct: official > 0 ? (amount / official) * 100 : 0 }
}

export function buildReport(r: ReportInput): string {
  const o = overcharge(r.official, r.charged)
  const when = r.when.toLocaleString(r.lang === 'fil' ? 'fil-PH' : 'en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
  const L = r.lang === 'fil'
    ? { title: 'Ulat ng sobrang singil', mode: 'Sasakyan', trip: 'Biyahe', when: 'Petsa/oras', plate: 'Plate / body no.', place: 'Lugar / ruta', charged: 'Siningil', official: 'Opisyal na pamasahe', over: 'Sobra', notes: 'Iba pang detalye', src: 'Batayan' }
    : { title: 'Overcharge report', mode: 'Vehicle', trip: 'Trip', when: 'Date/time', plate: 'Plate / body no.', place: 'Place / route', charged: 'Fare charged', official: 'Official fare', over: 'Overcharge', notes: 'Notes', src: 'Basis' }
  const lines = [
    L.title,
    `${L.mode}: ${r.modeName}`,
    `${L.trip}: ${r.tripLabel}`,
    `${L.when}: ${when}`,
    r.plate?.trim() ? `${L.plate}: ${r.plate.trim().toUpperCase()}` : null,
    r.place?.trim() ? `${L.place}: ${r.place.trim()}` : null,
    `${L.charged}: ${formatPesos(r.charged)}`,
    `${L.official}: ${formatPesos(r.official)} (${r.officialLabel})`,
    `${L.over}: ${formatPesos(o.amount)} (+${o.pct.toFixed(1)}%)`,
    r.notes?.trim() ? `${L.notes}: ${r.notes.trim()}` : null,
    `${L.src}: ${r.source} · magkano-pamasahe.vercel.app`,
  ]
  return lines.filter(Boolean).join('\n')
}
