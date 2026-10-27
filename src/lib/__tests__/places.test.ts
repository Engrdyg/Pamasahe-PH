import { beforeEach, describe, expect, it } from 'vitest'
import { addRecent, isSaved, loadPlaces, toggleSaved } from '../places'

const cubao = { label: 'Cubao', lat: 14.6197, lng: 121.0537 }
const quiapo = { label: 'Quiapo Church', lat: 14.5987, lng: 120.9837 }

describe('saved and recent places', () => {
  beforeEach(() => localStorage.clear())

  it('keeps recent places newest first, without duplicates, at most 10', () => {
    addRecent(cubao)
    addRecent(quiapo)
    addRecent(cubao)
    expect(loadPlaces().recent.map((p) => p.label)).toEqual(['Cubao', 'Quiapo Church'])
    for (let i = 0; i < 12; i++) addRecent({ label: `P${i}`, lat: 14 + i / 100, lng: 121 })
    expect(loadPlaces().recent).toHaveLength(10)
  })

  it('toggles saved places', () => {
    expect(isSaved(toggleSaved(cubao), cubao)).toBe(true)
    expect(isSaved(toggleSaved(cubao), cubao)).toBe(false)
  })
})
