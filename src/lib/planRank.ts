/** Route ranking for the planner: the same valid options, ordered by the
 *  rider's preference, plus why each option stands out. */
import type { SlimItinerary } from './planner'

export type Rank = 'fare' | 'time' | 'transfers' | 'walk'
export const RANKS: Rank[] = ['fare', 'time', 'transfers', 'walk']

const fareOf = (it: SlimItinerary, discount: boolean) => (discount ? it.discounted : it.regular) + (it.fareIncomplete ? 1e6 : 0)
const transfers = (it: SlimItinerary) => Math.max(0, it.rides - 1)

const key: Record<Rank, (it: SlimItinerary, discount: boolean) => number[]> = {
  fare: (it, d) => [fareOf(it, d), it.minutes, transfers(it)],
  time: (it, d) => [it.minutes, fareOf(it, d), transfers(it)],
  transfers: (it, d) => [transfers(it), it.minutes, fareOf(it, d)],
  walk: (it, d) => [Math.round(it.walkMeters / 50), it.minutes, fareOf(it, d)],
}

/** Options sorted by the preference, ties broken by the other measures. */
export function rankItineraries(its: SlimItinerary[], rank: Rank, discount: boolean): SlimItinerary[] {
  const k = key[rank]
  return [...its].sort((a, b) => {
    const x = k(a, discount)
    const y = k(b, discount)
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]
    return 0
  })
}

/** Measures on which this option is *the* top choice (one winner per measure:
 *  the first when sorted by that preference), so badges stay meaningful. */
export function reasons(it: SlimItinerary, all: SlimItinerary[], discount: boolean): Rank[] {
  if (all.length < 2) return []
  const riding = all.filter((x) => x.rides > 0)
  return RANKS.filter((r) => {
    const pool = r === 'fare' ? riding : all
    const top = rankItineraries(pool, r, discount)[0]
    if (top !== it) return false
    // Only worth a badge when some other option is actually worse on it.
    const v = key[r](it, discount)[0]
    return pool.some((x) => key[r](x, discount)[0] > v)
  })
}
