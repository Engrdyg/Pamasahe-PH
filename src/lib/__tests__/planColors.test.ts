import { describe, expect, it } from 'vitest'
import { rideColors } from '../planColors'

describe('rideColors', () => {
  it('gives two jeep rides different colours and rail its line colour', () => {
    const c = rideColors([
      { modeId: 'puj-traditional', kind: 'jeep' },
      { modeId: 'lrt-2', kind: 'rail' },
      { modeId: 'puj-traditional', kind: 'jeep' },
    ])
    expect(c[0]).not.toBe(c[2])
    expect(c[1]).toBe('#7c3aed')
    expect(new Set(c).size).toBe(3)
  })
})
