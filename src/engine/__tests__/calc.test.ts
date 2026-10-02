import { describe, expect, it } from 'vitest'
import {
  FareError,
  airportTaxiFare,
  chargedKm,
  destinationsFrom,
  distanceFare,
  generateTable,
  increase,
  matrixFare,
  taxiFare,
  tnvsFare,
} from '../calc'
import { modesById } from '../../data'
import type {
  AddOnMode,
  MatrixMode,
  PerKmMode,
  SteppedTaxiMode,
  TimeDistanceTaxiMode,
  TnvsMode,
} from '../types'

const pujModern = modesById['puj-modern'] as AddOnMode
const pujTrad = modesById['puj-traditional'] as AddOnMode
const provOrd = modesById['pub-prov-ordinary'] as AddOnMode
const provLux = modesById['pub-prov-luxury'] as PerKmMode
const provDeluxe = modesById['pub-prov-deluxe'] as PerKmMode
const uvTrad = modesById['uv-traditional'] as PerKmMode
const busway = modesById['edsa-busway'] as MatrixMode
const taxiRegular = modesById['taxi-regular'] as TimeDistanceTaxiMode
const airport = modesById['taxi-airport'] as SteppedTaxiMode
const tnvs = modesById['tnvs'] as TnvsMode
const mrt3 = modesById['mrt-3'] as MatrixMode
const lrt2 = modesById['lrt-2'] as MatrixMode

const pesos = (n: number) => Math.round(n * 100)

describe('spec §8 spot checks', () => {
  it.each([
    [pujModern, 10, 31.5, 25.0],
    [pujModern, 25, 67.5, 54.0],
    [pujTrad, 5, 16.0, 12.75],
    [pujTrad, 50, 106.0, 84.75],
    [provOrd, 10, 23.0, 18.5],
    [provOrd, 300, 661.0, 528.75],
    [provLux, 5, 16.75, 13.5],
    [provDeluxe, 5, 13.0, 10.5],
  ])('%s at %d km', (mode, km, reg, disc) => {
    const f = distanceFare(mode as AddOnMode | PerKmMode, km)
    expect(f.regular).toBe(pesos(reg))
    expect(f.discounted).toBe(pesos(disc))
  })
  it('user story 1: traditional jeep 12 km = 30.00 / 24.00', () => {
    const f = distanceFare(pujTrad, 12)
    expect([f.regular, f.discounted]).toEqual([3000, 2400])
  })
  it('busway southbound Monumento -> PITX = 85.00 / 67.75', () => {
    const f = matrixFare(busway, 'southbound', 'Monumento', 'PITX')
    expect([f.regular, f.discounted]).toEqual([8500, 6775])
  })
  it('busway southbound Monumento -> Bagong Barrio = 18.00 / 14.50', () => {
    const f = matrixFare(busway, 'southbound', 'Monumento', 'Bagong Barrio')
    expect([f.regular, f.discounted]).toEqual([1800, 1450])
  })
  it('airport taxi 500 m, 0 min = 115.00', () => {
    expect(airportTaxiFare(airport, 500, 0).total).toBe(11500)
  })
})

describe('distance rules', () => {
  it('rounds partial km up (FR-5)', () => {
    expect(chargedKm(4.2)).toBe(5)
    expect(chargedKm(5)).toBe(5)
    expect(distanceFare(pujTrad, 4.2).regular).toBe(distanceFare(pujTrad, 5).regular)
    expect(distanceFare(pujTrad, 4.2).chargedKm).toBe(5)
  })
  it('discount is computed from discounted rates then rounded, not 80% of rounded regular', () => {
    // Modern PUJ 1 km: 13.60 -> 13.50 (not 17.00 * 0.8 = 13.60)
    expect(distanceFare(pujModern, 1).discounted).toBe(1350)
    // Traditional PUJ 1 km: 11.20 -> 11.25
    expect(distanceFare(pujTrad, 1).discounted).toBe(1125)
  })
  it('UV Express is pure per-km with 20% discounted rate', () => {
    expect(distanceFare(uvTrad, 10).regular).toBe(2600)
    expect(distanceFare(uvTrad, 10).discounted).toBe(2075) // 20.80 -> 20.75
    expect(distanceFare(uvTrad, 1).regular).toBe(250) // 2.60 -> 2.50
  })
  it('flags distances beyond the published table but still computes', () => {
    const f = distanceFare(pujTrad, 51)
    expect(f.beyondTable).toBe(true)
    expect(f.regular).toBe(10800)
    expect(distanceFare(pujTrad, 50).beyondTable).toBe(false)
  })
  it('rejects zero or negative distance', () => {
    expect(() => distanceFare(pujTrad, 0)).toThrow(FareError)
    expect(() => distanceFare(pujTrad, -1)).toThrow(FareError)
    expect(() => distanceFare(pujTrad, Number.NaN)).toThrow(FareError)
  })
  it('reports old fares and the increase', () => {
    const f = distanceFare(pujTrad, 12)
    expect(f.previous).toEqual({ regular: 2750, discounted: 2200 })
    const inc = increase(f.regular, f.previous!.regular)
    expect(inc.amount).toBe(250)
    expect(inc.pct).toBeCloseTo(9.09, 2)
  })
  it('generates the published table from the formula', () => {
    const rows = generateTable(pujTrad)
    expect(rows).toHaveLength(50)
    expect(rows[0].km).toBe(1)
    expect(rows[49].regular).toBe(10600)
    expect(generateTable(provOrd)).toHaveLength(120)
  })
})

describe('metered', () => {
  it('regular taxi breakdown', () => {
    const b = taxiFare(taxiRegular, 10, 20)
    expect(b).toMatchObject({ flagDown: 6500, distance: 13500, time: 4000, pickup: 0, total: 24000 })
    expect(b.discounted).toBe(19200)
  })
  it('regular taxi with fractional km/min rounds to the centavo', () => {
    const b = taxiFare(taxiRegular, 2.5, 7.5)
    expect(b.distance).toBe(3375)
    expect(b.time).toBe(1500)
  })
  it('airport taxi steps distance up and time down', () => {
    expect(airportTaxiFare(airport, 800, 0).distance).toBe(400) // exactly one 300 m step
    expect(airportTaxiFare(airport, 801, 0).distance).toBe(800) // partial step charged
    expect(airportTaxiFare(airport, 0, 3).time).toBe(400) // 3 min -> one 2-min block
    expect(airportTaxiFare(airport, 0, 4).time).toBe(800)
    expect(airportTaxiFare(airport, 5000, 10).total).toBe(11500 + 15 * 400 + 5 * 400)
    expect(airportTaxiFare(airport, 5000, 10).discounted).toBe(Math.round((11500 + 8000) * 0.8))
  })
  it('tnvs per vehicle with floored pick-up km', () => {
    expect(tnvsFare(tnvs, 'sedan', 10, 30).total).toBe(6500 + 15000 + 6000)
    expect(tnvsFare(tnvs, 'premium', 10, 30).total).toBe(16500 + 36000 + 12000)
    expect(tnvsFare(tnvs, 'hatchback', 0, 0, 0.9).pickup).toBe(0)
    expect(tnvsFare(tnvs, 'hatchback', 0, 0, 2.9).pickup).toBe(3000)
    expect(() => tnvsFare(tnvs, 'bike', 1, 1)).toThrow(FareError)
  })
  it('rejects negative inputs', () => {
    expect(() => taxiFare(taxiRegular, -1, 0)).toThrow(FareError)
    expect(() => taxiFare(taxiRegular, 1, -1)).toThrow(FareError)
    expect(() => airportTaxiFare(airport, -1, 0)).toThrow(FareError)
  })
})

describe('rail (symmetric ticket matrices)', () => {
  it('MRT-3: North Avenue ↔ Taft Avenue is ₱14 either way, 20% off computed', () => {
    const f = matrixFare(mrt3, 'single-journey', 'North Avenue', 'Taft Avenue')
    expect(f.regular).toBe(1400)
    expect(f.discounted).toBe(1120)
    expect(matrixFare(mrt3, 'stored-value', 'Taft Avenue', 'North Avenue').regular).toBe(1400)
    expect(matrixFare(mrt3, 'single-journey', 'Ayala', 'Buendia').regular).toBe(600)
  })
  it('LRT-2: Recto ↔ Antipolo single journey ₱18 (was ₱35), stored value ₱16.50', () => {
    const sjt = matrixFare(lrt2, 'single-journey', 'Antipolo', 'Recto')
    expect(sjt.regular).toBe(1800)
    expect(sjt.previous?.regular).toBe(3500)
    expect(matrixFare(lrt2, 'stored-value', 'Recto', 'Antipolo').regular).toBe(1650)
    expect(matrixFare(lrt2, 'stored-value', 'Araneta Center-Cubao', 'Katipunan').regular).toBe(800)
  })
  it('lists every other station as a destination', () => {
    expect(destinationsFrom(mrt3, 'single-journey', 'Taft Avenue')).toHaveLength(12)
    expect(destinationsFrom(mrt3, 'single-journey', 'Taft Avenue')).not.toContain('Taft Avenue')
  })
})

describe('matrix', () => {
  it('northbound and southbound are separate matrices', () => {
    expect(busway.directions.southbound.stations).toHaveLength(24)
    expect(busway.directions.northbound.stations).toHaveLength(23)
    expect(matrixFare(busway, 'northbound', 'PITX', 'Monumento').regular).toBe(8500)
    expect(matrixFare(busway, 'northbound', 'PITX', 'City of Dreams').regular).toBe(1800)
  })
  it('rejects destination before origin, same station, unknown station or direction', () => {
    expect(() => matrixFare(busway, 'southbound', 'PITX', 'Monumento')).toThrow(/after origin/)
    expect(() => matrixFare(busway, 'southbound', 'Ayala', 'Ayala')).toThrow(FareError)
    expect(() => matrixFare(busway, 'southbound', 'Ayala', 'Nowhere')).toThrow(FareError)
    expect(() => matrixFare(busway, 'eastbound', 'Ayala', 'PITX')).toThrow(FareError)
  })
  it('lists only destinations after the origin', () => {
    expect(destinationsFrom(busway, 'southbound', 'Ayala Malls/Aseana')).toEqual(['PITX'])
    expect(destinationsFrom(busway, 'southbound', 'PITX')).toEqual([])
    expect(destinationsFrom(busway, 'southbound', 'Monumento')).toHaveLength(23)
  })
  it('has map details for every station in both directions', () => {
    for (const [name, dir] of Object.entries(busway.directions)) {
      expect(dir.stationInfo, name).toHaveLength(dir.stations.length)
      dir.stationInfo!.forEach((info, k) => {
        expect(info, `${name} ${dir.stations[k]}`).not.toBeNull()
        // Metro Manila bounding box
        expect(info!.lat).toBeGreaterThan(14.4)
        expect(info!.lat).toBeLessThan(14.8)
        expect(info!.lng).toBeGreaterThan(120.9)
        expect(info!.lng).toBeLessThan(121.2)
      })
    }
  })
  it('never goes below the minimum fare', () => {
    for (const dir of Object.values(busway.directions)) {
      dir.regular.flat().forEach((v) => v != null && expect(v).toBeGreaterThanOrEqual(18))
      dir.discounted.flat().forEach((v) => v != null && expect(v).toBeGreaterThanOrEqual(14.5))
    }
  })
})
