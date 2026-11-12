/** Plain-language fare rules ("₱15.00 for the first 5 km, +₱2.49 per succeeding km"). */
import { formatPesos, toCentavos, type Category, type Mode } from '../engine'

type T = (key: string, opts?: Record<string, unknown>) => string
const p = (pesos: number) => formatPesos(toCentavos(pesos))

/** Full rule for one mode, as shown on its calculator. */
export function rateSummary(mode: Mode, discount: boolean, t: T): string {
  switch (mode.method) {
    case 'ADD_ON': {
      const r = discount ? mode.discounted : mode.regular
      return t('rate.addOn', { base: p(r.baseFare), km: r.baseKm, per: p(r.perKm) })
    }
    case 'PER_KM': {
      const r = discount ? mode.discounted : mode.regular
      return t('rate.perKm', { per: p(r.perKm) })
    }
    case 'METERED': {
      const off = discount ? ` ${t('rate.discountTotal', { pct: mode.discountPct })}` : ''
      if ('vehicles' in mode) {
        const flags = mode.vehicles.map((v) => v.flagDown)
        return t('rate.tnvs', { lo: p(Math.min(...flags)), hi: p(Math.max(...flags)) }) + off
      }
      if ('distanceStep' in mode)
        return (
          t('rate.airport', {
            flag: p(mode.flagDown),
            m: mode.flagDownCoversMeters,
            step: p(mode.distanceStep.fare),
            stepM: mode.distanceStep.meters,
            time: p(mode.timeStep.fare),
            timeMin: mode.timeStep.minutes,
          }) + off
        )
      return t('rate.taxi', { flag: p(mode.flagDown), km: p(mode.perKm), min: p(mode.perMin) }) + off
    }
    case 'MATRIX':
      return t('rate.matrix', { min: p(discount ? mode.minFare.discounted : mode.minFare.regular) })
  }
}

/** What a tile amount means, so a minimum fare, a per-km rate and a
 *  flag-down are never read as the same kind of total trip price. */
export type BasisKind = 'minimum' | 'perKm' | 'flagDown' | 'matrix'

export function categoryBasis(category: Category, modes: Mode[]): BasisKind | null {
  const m = cheapestMode(category, modes, false)
  if (!m) return null
  return m.method === 'ADD_ON' ? 'minimum' : m.method === 'PER_KM' ? 'perKm' : m.method === 'METERED' ? 'flagDown' : 'matrix'
}

const startFare = (m: Mode, discount: boolean): number => {
  switch (m.method) {
    case 'ADD_ON':
      return (discount ? m.discounted : m.regular).baseFare
    case 'PER_KM':
      return (discount ? m.discounted : m.regular).perKm
    case 'METERED':
      return 'vehicles' in m ? Math.min(...m.vehicles.map((v) => v.flagDown)) : m.flagDown
    case 'MATRIX':
      return discount ? m.minFare.discounted : m.minFare.regular
  }
}

/** The mode a category tile describes: the one with the lowest starting amount. */
function cheapestMode(category: Category, modes: Mode[], discount: boolean): Mode | null {
  const list = modes.filter((m) => m.category === category && m.status !== 'pending_data')
  return list.length ? list.reduce((a, b) => (startFare(b, discount) < startFare(a, discount) ? b : a)) : null
}

/** Short "from" line for a category tile, using its cheapest mode. */
export function categoryFrom(category: Category, modes: Mode[], discount: boolean, t: T): string | null {
  // Pick by regular fares so the tile's basis label and amount describe the same mode.
  const m = cheapestMode(category, modes, false)
  if (!m) return null
  const start = startFare(m, discount)
  switch (m.method) {
    case 'ADD_ON':
      return t('rate.fromAddOn', { base: p(start), km: (discount ? m.discounted : m.regular).baseKm })
    case 'PER_KM':
      return t('rate.fromPerKm', { per: p(start) })
    case 'METERED':
      return t('rate.fromFlag', { flag: p(start) })
    case 'MATRIX':
      return t('rate.fromMin', { min: p(start) })
  }
}
