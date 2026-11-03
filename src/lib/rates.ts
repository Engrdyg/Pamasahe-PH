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

/** Short "from" line for a category tile, using its cheapest mode. */
export function categoryFrom(category: Category, modes: Mode[], discount: boolean, t: T): string | null {
  const list = modes.filter((m) => m.category === category && m.status !== 'pending_data')
  if (!list.length) return null
  const start = (m: Mode): number => {
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
  const m = list.reduce((a, b) => (start(b) < start(a) ? b : a))
  switch (m.method) {
    case 'ADD_ON':
      return t('rate.fromAddOn', { base: p(start(m)), km: (discount ? m.discounted : m.regular).baseKm })
    case 'PER_KM':
      return t('rate.fromPerKm', { per: p(start(m)) })
    case 'METERED':
      return t('rate.fromFlag', { flag: p(start(m)) })
    case 'MATRIX':
      return t('rate.fromMin', { min: p(start(m)) })
  }
}
