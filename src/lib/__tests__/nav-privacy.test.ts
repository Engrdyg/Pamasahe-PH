import { describe, expect, it } from 'vitest'
import { analyticsPath } from '../../components/Analytics'
import { navSection } from '../../components/Nav'
import { draftLabel, getDraft, planHref, setDraft } from '../places'

describe('analytics paths', () => {
  it('never reports coordinates from route-planner deep links', () => {
    expect(analyticsPath(['plan', '14.55,121.02', '14.6,121.0'])).toEqual({ path: '/plan', route: '/plan' })
  })
  it('groups calculators by category', () => {
    expect(analyticsPath(['calc', 'jeepney'])).toEqual({ path: '/calc/jeepney', route: '/calc/[category]' })
  })
})

describe('navigation sections', () => {
  it('maps every screen to one primary destination', () => {
    expect(navSection(undefined)).toBe('')
    expect(navSection('plan')).toBe('plan')
    expect(navSection('calc')).toBe('fares')
    expect(navSection('trip')).toBe('trip')
    for (const s of ['more', 'compare', 'tables', 'support', 'about', 'privacy']) expect(navSection(s)).toBe('more')
  })
})

describe('plan draft', () => {
  it('builds planner links with either end missing', () => {
    expect(planHref(null, null)).toBe('#/plan')
    expect(planHref({ lat: 14.5, lng: 121 }, null)).toBe('#/plan/14.50000,121.00000/-')
    expect(planHref(null, { lat: 14.6, lng: 121.05 })).toBe('#/plan/-/14.60000,121.05000')
  })
  it('remembers the names of picked places', () => {
    setDraft({ from: { label: 'SM North EDSA', lat: 14.6566, lng: 121.0291 } })
    expect(getDraft().from?.label).toBe('SM North EDSA')
    expect(draftLabel({ lat: 14.65662, lng: 121.02912 })).toBe('SM North EDSA')
    expect(draftLabel({ lat: 14.7, lng: 121.0 })).toBeNull()
  })
})
