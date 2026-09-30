#!/usr/bin/env node
/** Sanity-check fares/*.json against the manifest (runs in CI before tests). */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = new URL('../fares/', import.meta.url).pathname
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'manifest.json')
const errors = []

if (!/^\d{4}\.\d{2}\.\d{2}-\d+$/.test(manifest.version)) errors.push(`bad manifest version ${manifest.version}`)
for (const id of manifest.modes) if (!files.includes(`${id}.json`)) errors.push(`manifest lists ${id} but fares/${id}.json is missing`)
for (const f of files) if (!manifest.modes.includes(f.replace('.json', ''))) errors.push(`${f} is not listed in the manifest`)

const isMoney = (v) => Number.isFinite(v) && v >= 0 && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6
for (const f of files) {
  const m = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  if (m.id !== f.replace('.json', '')) errors.push(`${f}: id "${m.id}" does not match file name`)
  if (m.effective !== manifest.effective) errors.push(`${f}: effective ${m.effective} != manifest ${manifest.effective}`)
  if (!m.name?.en || !m.name?.fil) errors.push(`${f}: name must have en and fil`)
  switch (m.method) {
    case 'ADD_ON':
      for (const k of ['regular', 'discounted']) {
        const r = m[k]
        if (!r || !isMoney(r.baseFare) || !isMoney(r.perKm) || !(r.baseKm > 0)) errors.push(`${f}: bad ${k} ADD_ON rate`)
      }
      if (m.discounted && m.regular && Math.abs(m.discounted.perKm - m.regular.perKm * 0.8) > 0.005) errors.push(`${f}: discounted perKm is not 80% of regular`)
      break
    case 'PER_KM':
      for (const k of ['regular', 'discounted']) if (!isMoney(m[k]?.perKm)) errors.push(`${f}: bad ${k} PER_KM rate`)
      if (Math.abs(m.discounted.perKm - m.regular.perKm * 0.8) > 0.005) errors.push(`${f}: discounted perKm is not 80% of regular`)
      break
    case 'METERED':
      if (m.variant === 'tnvs') {
        if (!Array.isArray(m.vehicles) || m.vehicles.length === 0) errors.push(`${f}: no vehicles`)
        for (const v of m.vehicles ?? []) if (![v.flagDown, v.perKm, v.perMin].every(isMoney)) errors.push(`${f}: bad vehicle ${v.id}`)
      } else if (m.variant === 'stepped') {
        if (![m.flagDown, m.distanceStep?.fare, m.timeStep?.fare].every(isMoney)) errors.push(`${f}: bad stepped rates`)
      } else if (![m.flagDown, m.perKm, m.perMin].every(isMoney)) errors.push(`${f}: bad metered rates`)
      break
    case 'MATRIX':
      for (const [d, dir] of Object.entries(m.directions ?? {})) {
        const n = dir.stations.length
        for (const k of ['regular', 'discounted']) {
          if (dir[k].length !== n) errors.push(`${f}: ${d}.${k} has ${dir[k].length} rows, expected ${n}`)
          for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++) {
              const v = dir[k][i]?.[j]
              if (j <= i ? v !== null : !isMoney(v) || v < m.minFare[k]) errors.push(`${f}: ${d}.${k}[${i}][${j}] invalid (${v})`)
            }
        }
      }
      break
    default:
      errors.push(`${f}: unknown method ${m.method}`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`fares OK: ${files.length} modes, version ${manifest.version}, effective ${manifest.effective}`)
