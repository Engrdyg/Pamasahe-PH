import { describe, expect, it } from 'vitest'
import { applyDiscountPct, formatPesos, round25, roundTo, toCentavos, toPesos } from '../money'

describe('money', () => {
  it('converts pesos to integer centavos without float drift', () => {
    expect(toCentavos(1.92)).toBe(192)
    expect(toCentavos(2.38)).toBe(238)
    expect(toCentavos(0.1 + 0.2)).toBe(30)
    expect(toPesos(1125)).toBe(11.25)
  })
  it('rounds to nearest 25 centavos, half up', () => {
    expect(round25(1120)).toBe(1125) // 11.20 -> 11.25
    expect(round25(1360)).toBe(1350) // 13.60 -> 13.50
    expect(round25(1552)).toBe(1550)
    expect(round25(1287)).toBe(1275)
    expect(round25(1288)).toBe(1300)
    expect(round25(1262.5)).toBe(1275) // exact half rounds up
    expect(roundTo(1120, 0.25)).toBe(1125)
    expect(roundTo(1123, 0)).toBe(1123)
  })
  it('applies percentage discounts', () => {
    expect(applyDiscountPct(6500, 20)).toBe(5200)
    expect(applyDiscountPct(11501, 20)).toBe(9201)
  })
  it('formats pesos', () => {
    expect(formatPesos(1125)).toBe('₱11.25')
    expect(formatPesos(132100)).toBe('₱1,321.00')
    expect(formatPesos(-250)).toBe('-₱2.50')
    expect(formatPesos(250, { sign: true })).toBe('+₱2.50')
    expect(formatPesos(0, { sign: true })).toBe('₱0.00')
  })
})
