import { applyDiscountPct, roundTo, toCentavos } from './money'
import type {
  AddOnMode,
  AddOnRate,
  Centavos,
  DistanceFare,
  DistanceMode,
  MatrixFare,
  MatrixMode,
  MeteredBreakdown,
  PerKmMode,
  PerKmRate,
  SteppedTaxiMode,
  TimeDistanceTaxiMode,
  TnvsMode,
} from './types'

export class FareError extends Error {
  constructor(
    public code:
      | 'INVALID_DISTANCE'
      | 'INVALID_TIME'
      | 'UNKNOWN_STATION'
      | 'UNKNOWN_DIRECTION'
      | 'DESTINATION_BEFORE_ORIGIN'
      | 'SAME_STATION'
      | 'UNKNOWN_VEHICLE',
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'FareError'
  }
}

const assertPositive = (km: number) => {
  if (!Number.isFinite(km) || km <= 0) throw new FareError('INVALID_DISTANCE')
}

/** FR-5: partial km are rounded up to the next whole km. */
export const chargedKm = (km: number): number => Math.ceil(km - 1e-9)

export function addOnFare(km: number, r: AddOnRate, rounding: number): Centavos {
  const k = chargedKm(km)
  const raw = toCentavos(r.baseFare) + Math.max(0, k - r.baseKm) * toCentavos(r.perKm)
  return roundTo(raw, rounding)
}

export function perKmFare(km: number, r: PerKmRate, rounding: number): Centavos {
  const k = chargedKm(km)
  return roundTo(k * toCentavos(r.perKm), rounding)
}

function rateFare(mode: DistanceMode, km: number, which: 'regular' | 'discounted'): Centavos {
  return mode.method === 'ADD_ON'
    ? addOnFare(km, (mode as AddOnMode)[which], mode.rounding)
    : perKmFare(km, (mode as PerKmMode)[which], mode.rounding)
}

function previousFare(
  mode: DistanceMode,
  km: number,
): { regular: Centavos; discounted: Centavos } | undefined {
  if (!mode.previous) return undefined
  if (mode.method === 'ADD_ON') {
    const p = (mode as AddOnMode).previous!
    return {
      regular: addOnFare(km, p.regular, mode.rounding),
      discounted: addOnFare(km, p.discounted, mode.rounding),
    }
  }
  const p = (mode as PerKmMode).previous!
  return {
    regular: perKmFare(km, p.regular, mode.rounding),
    discounted: perKmFare(km, p.discounted, mode.rounding),
  }
}

/** ADD_ON and PER_KM modes. */
export function distanceFare(mode: DistanceMode, km: number): DistanceFare {
  assertPositive(km)
  const k = chargedKm(km)
  return {
    km,
    chargedKm: k,
    regular: rateFare(mode, km, 'regular'),
    discounted: rateFare(mode, km, 'discounted'),
    previous: previousFare(mode, km),
    beyondTable: mode.tableRange ? k > mode.tableRange.maxKm : false,
  }
}

/** Regular, Silver, Gold taxi: flag-down + per-km + per-minute. */
export function taxiFare(mode: TimeDistanceTaxiMode, km: number, minutes: number): MeteredBreakdown {
  if (!Number.isFinite(km) || km < 0) throw new FareError('INVALID_DISTANCE')
  if (!Number.isFinite(minutes) || minutes < 0) throw new FareError('INVALID_TIME')
  const flagDown = toCentavos(mode.flagDown)
  const distance = Math.round(km * toCentavos(mode.perKm))
  const time = Math.round(minutes * toCentavos(mode.perMin))
  const total = flagDown + distance + time
  return { flagDown, distance, time, pickup: 0, total, discounted: applyDiscountPct(total, mode.discountPct) }
}

/** Airport taxi: flag-down covers the first N metres, then stepped charges. */
export function airportTaxiFare(mode: SteppedTaxiMode, meters: number, minutes: number): MeteredBreakdown {
  if (!Number.isFinite(meters) || meters < 0) throw new FareError('INVALID_DISTANCE')
  if (!Number.isFinite(minutes) || minutes < 0) throw new FareError('INVALID_TIME')
  const flagDown = toCentavos(mode.flagDown)
  const steps = Math.ceil(Math.max(0, meters - mode.flagDownCoversMeters) / mode.distanceStep.meters - 1e-9)
  const distance = steps * toCentavos(mode.distanceStep.fare)
  const time = Math.floor(minutes / mode.timeStep.minutes + 1e-9) * toCentavos(mode.timeStep.fare)
  const total = flagDown + distance + time
  return { flagDown, distance, time, pickup: 0, total, discounted: applyDiscountPct(total, mode.discountPct) }
}

/** TNVS: per-vehicle metered fare plus optional pick-up distance charge. */
export function tnvsFare(
  mode: TnvsMode,
  vehicleId: string,
  km: number,
  minutes: number,
  pickupKm = 0,
): MeteredBreakdown {
  const v = mode.vehicles.find((x) => x.id === vehicleId)
  if (!v) throw new FareError('UNKNOWN_VEHICLE')
  if (!Number.isFinite(km) || km < 0) throw new FareError('INVALID_DISTANCE')
  if (!Number.isFinite(minutes) || minutes < 0) throw new FareError('INVALID_TIME')
  if (!Number.isFinite(pickupKm) || pickupKm < 0) throw new FareError('INVALID_DISTANCE')
  const flagDown = toCentavos(v.flagDown)
  const distance = Math.round(km * toCentavos(v.perKm))
  const time = Math.round(minutes * toCentavos(v.perMin))
  // "No additional charge for fractional or less than 1 km" -> floor.
  const pickup = Math.floor(pickupKm + 1e-9) * toCentavos(mode.pickupPerKm)
  const total = flagDown + distance + time + pickup
  return { flagDown, distance, time, pickup, total, discounted: applyDiscountPct(total, mode.discountPct) }
}

/** Station-to-station matrix lookup. */
export function matrixFare(mode: MatrixMode, direction: string, from: string, to: string): MatrixFare {
  const d = mode.directions[direction]
  if (!d) throw new FareError('UNKNOWN_DIRECTION')
  let i = d.stations.indexOf(from)
  let j = d.stations.indexOf(to)
  if (i < 0 || j < 0) throw new FareError('UNKNOWN_STATION')
  if (i === j) throw new FareError('SAME_STATION')
  if (j < i) {
    if (mode.kind !== 'ticket') throw new FareError('DESTINATION_BEFORE_ORIGIN', 'Destination must be after origin for this direction')
    ;[i, j] = [j, i] // symmetric fares: same price both ways
  }
  const regular = d.regular[i][j]
  const discounted = d.discounted[i][j]
  if (regular == null || discounted == null) throw new FareError('UNKNOWN_STATION')
  const prev = d.previous?.regular[i][j]
  return {
    from,
    to,
    regular: toCentavos(regular),
    discounted: toCentavos(discounted),
    previous: prev != null ? { regular: toCentavos(prev) } : undefined,
  }
}

/** Destinations reachable from `from` in `direction` (those after it). */
export function destinationsFrom(mode: MatrixMode, direction: string, from: string): string[] {
  const d = mode.directions[direction]
  if (!d) return []
  const i = d.stations.indexOf(from)
  if (i < 0) return []
  return mode.kind === 'ticket' ? d.stations.filter((s) => s !== from) : d.stations.slice(i + 1)
}

/** Generate the published-style table from the formula (FR-12). */
export function generateTable(mode: DistanceMode, range = mode.tableRange): DistanceFare[] {
  if (!range) return []
  const rows: DistanceFare[] = []
  for (let km = range.minKm; km <= range.maxKm; km += range.stepKm) rows.push(distanceFare(mode, km))
  return rows
}

export interface Increase {
  amount: Centavos
  pct: number
}
export const increase = (now: Centavos, before: Centavos): Increase => ({
  amount: now - before,
  pct: before === 0 ? 0 : ((now - before) / before) * 100,
})
