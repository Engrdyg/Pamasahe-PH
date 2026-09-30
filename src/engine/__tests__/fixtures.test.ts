/**
 * Every row of every published LTFRB table (extracted by scripts/extract.py
 * into /fixtures) must match the formula engine exactly (spec §8).
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { distanceFare, matrixFare } from '../calc'
import { toCentavos } from '../money'
import { modesById } from '../../data'
import type { DistanceMode, MatrixMode } from '../types'

const FIXTURES = join(__dirname, '../../../fixtures')

interface KmFixture {
  source: string
  mode: string
  rows: {
    km: number
    old: { regular: number; discounted: number }
    new: { regular: number; discounted: number }
  }[]
}
interface MatrixFixture {
  source: string
  stations: string[]
  regular: (number | null)[][]
  discounted: (number | null)[][]
}

const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.json'))
const kmFiles = files.filter((f) => !f.startsWith('edsa-busway'))
const matrixFiles = files.filter((f) => f.startsWith('edsa-busway'))

describe('km table fixtures', () => {
  it('cover every ADD_ON / PER_KM mode that has a published table', () => {
    const withTables = Object.values(modesById)
      .filter((m) => (m.method === 'ADD_ON' || m.method === 'PER_KM') && m.tableRange)
      .map((m) => m.id)
      .sort()
    expect(kmFiles.map((f) => f.replace('.json', '')).sort()).toEqual(withTables)
  })

  for (const file of kmFiles) {
    const fx = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')) as KmFixture
    const mode = modesById[fx.mode] as DistanceMode
    describe(`${fx.mode} (${fx.source})`, () => {
      it('has the full published range', () => {
        const r = mode.tableRange!
        expect(fx.rows[0].km).toBe(r.minKm)
        expect(fx.rows[fx.rows.length - 1].km).toBe(r.maxKm)
        expect(fx.rows).toHaveLength((r.maxKm - r.minKm) / r.stepKm + 1)
      })
      it('matches every row: new regular, new discounted, old regular, old discounted', () => {
        const mismatches: string[] = []
        for (const row of fx.rows) {
          const f = distanceFare(mode, row.km)
          const want = {
            regular: toCentavos(row.new.regular),
            discounted: toCentavos(row.new.discounted),
            oldRegular: toCentavos(row.old.regular),
            oldDiscounted: toCentavos(row.old.discounted),
          }
          const got = {
            regular: f.regular,
            discounted: f.discounted,
            oldRegular: f.previous?.regular,
            oldDiscounted: f.previous?.discounted,
          }
          for (const k of Object.keys(want) as (keyof typeof want)[]) {
            if (want[k] !== got[k]) mismatches.push(`${row.km} km ${k}: table ${want[k]} engine ${got[k]}`)
          }
        }
        expect(mismatches).toEqual([])
      })
    })
  }
})

describe('EDSA Busway matrix fixtures', () => {
  const busway = modesById['edsa-busway'] as MatrixMode
  it('has both directions', () => {
    expect(matrixFiles.sort()).toEqual(['edsa-busway-northbound.json', 'edsa-busway-southbound.json'])
  })
  for (const file of matrixFiles) {
    const dir = file.replace('edsa-busway-', '').replace('.json', '')
    const fx = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')) as MatrixFixture
    it(`${dir}: every station pair matches (${fx.source})`, () => {
      expect(busway.directions[dir].stations).toEqual(fx.stations)
      let pairs = 0
      for (let i = 0; i < fx.stations.length; i++) {
        for (let j = i + 1; j < fx.stations.length; j++) {
          const f = matrixFare(busway, dir, fx.stations[i], fx.stations[j])
          expect(f.regular).toBe(toCentavos(fx.regular[i][j]!))
          expect(f.discounted).toBe(toCentavos(fx.discounted[i][j]!))
          pairs++
        }
      }
      expect(pairs).toBe((fx.stations.length * (fx.stations.length - 1)) / 2)
    })
  }
})
