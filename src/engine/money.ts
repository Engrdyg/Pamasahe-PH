import type { Centavos } from './types'

/** Decimal pesos (as stored in JSON) -> integer centavos. */
export const toCentavos = (pesos: number): Centavos => Math.round(pesos * 100)

/** Integer centavos -> decimal pesos. */
export const toPesos = (c: Centavos): number => c / 100

/** Round to the nearest 25 centavos, half up. */
export const round25 = (c: Centavos): Centavos => Math.floor(c / 25 + 0.5) * 25

/** Round to a configurable step (pesos, e.g. 0.25). */
export const roundTo = (c: Centavos, stepPesos: number): Centavos => {
  const step = toCentavos(stepPesos)
  if (step <= 0) return Math.round(c)
  return Math.floor(c / step + 0.5) * step
}

/** Apply a percentage discount to a centavo amount, rounded to the centavo. */
export const applyDiscountPct = (c: Centavos, pct: number): Centavos =>
  Math.round((c * (100 - pct)) / 100)

/** "₱1,234.50" */
export function formatPesos(c: Centavos, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(c)
  const whole = Math.floor(abs / 100)
  const frac = abs % 100
  const body = `${whole.toLocaleString('en-PH')}.${frac.toString().padStart(2, '0')}`
  const sign = c < 0 ? '-' : opts.sign && c > 0 ? '+' : ''
  return `${sign}₱${body}`
}
