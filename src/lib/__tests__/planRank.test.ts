import { describe, expect, it } from 'vitest'
import { rankItineraries, reasons } from '../planRank'
import type { SlimItinerary } from '../planner'

const opt = (name: string, minutes: number, regular: number, rides: number, walkMeters: number): SlimItinerary =>
  ({ legs: [], minutes, regular, discounted: Math.round(regular * 0.8), rides, walkMeters, fareIncomplete: false, name }) as unknown as SlimItinerary
const a = opt('fast', 30, 3000, 2, 800)
const b = opt('cheap', 45, 1400, 1, 300)
const c = opt('direct', 40, 2600, 1, 900)
const all = [a, b, c]
const names = (xs: SlimItinerary[]) => xs.map((x) => (x as unknown as { name: string }).name)

describe('route ranking', () => {
  it('re-orders the same options for each preference', () => {
    expect(names(rankItineraries(all, 'time', false))).toEqual(['fast', 'direct', 'cheap'])
    expect(names(rankItineraries(all, 'fare', false))).toEqual(['cheap', 'direct', 'fast'])
    expect(names(rankItineraries(all, 'transfers', false))).toEqual(['direct', 'cheap', 'fast'])
    expect(names(rankItineraries(all, 'walk', false))).toEqual(['cheap', 'fast', 'direct'])
    expect(rankItineraries(all, 'fare', false)).toHaveLength(3)
  })
  it('explains why an option stands out', () => {
    expect(reasons(a, all, false)).toEqual(['time'])
    // b and c tie on transfers; the faster one (c) wins that badge.
    expect(reasons(b, all, false)).toEqual(['fare', 'walk'])
    expect(reasons(c, all, false)).toEqual(['transfers'])
    expect(reasons(a, [a], false)).toEqual([])
  })
})
