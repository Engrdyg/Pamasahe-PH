import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChangeCalc } from '../components/ChangeCalc'
import { Card } from '../components/ui'
import { formatPesos } from '../engine'
import { getGuide } from '../lib/guide'
import type { SlimLeg } from '../lib/planner'
import { useApp } from '../state'

type Ride = Exclude<SlimLeg, { type: 'walk' }>
const ICON = { jeep: '🚙', uv: '🚐', rail: '🚆', busway: '🚌' } as const
const STEP_KEY = 'pamasahe-ph:guide-step'
const NEAR_M = 250

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const k = 111320
  return Math.hypot((a.lat - b.lat) * k, (a.lng - b.lng) * k * Math.cos((a.lat * Math.PI) / 180))
}

/**
 * Guided trip: one step at a time (walk, ride, transfer) for the route chosen
 * in the planner. Moving between steps is manual. GPS progress is optional and
 * only shows the straight-line distance to the next get-off point, with an
 * alert when it is near.
 */
export function Guide() {
  const { t } = useTranslation()
  const { discount, modesById } = useApp()
  const [guide] = useState(() => getGuide())
  const [step, setStepState] = useState(() => {
    try {
      return Number(sessionStorage.getItem(STEP_KEY) ?? 0) || 0
    } catch {
      return 0
    }
  })
  const setStep = (n: number) => {
    setStepState(n)
    try {
      sessionStorage.setItem(STEP_KEY, String(n))
    } catch {
      /* ignore */
    }
  }
  const [gps, setGps] = useState(false)
  const [fix, setFix] = useState<{ lat: number; lng: number; acc: number } | null>(null)
  const [gpsError, setGpsError] = useState(false)
  const watch = useRef<number | null>(null)
  const alerted = useRef<number | null>(null)

  useEffect(() => {
    if (!gps || !navigator.geolocation) return
    setGpsError(false)
    watch.current = navigator.geolocation.watchPosition(
      (p) => setFix({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => setGpsError(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => {
      if (watch.current != null) navigator.geolocation.clearWatch(watch.current)
      watch.current = null
    }
  }, [gps])

  if (!guide) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4" data-testid="guide-screen">
        <Card>
          <p className="text-sm text-ink-2">{t('guide.none')}</p>
          <a href="#/plan" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
            {t('trip.planRoute')}
          </a>
        </Card>
      </main>
    )
  }

  const legs = guide.itinerary.legs
  const cur = Math.min(step, legs.length - 1)
  const leg = legs[cur]
  const rides = legs.filter((l): l is Ride => l.type === 'ride')
  const rideNo = leg.type === 'ride' ? rides.indexOf(leg) : -1
  const nextRide = legs.slice(cur + 1).find((l): l is Ride => l.type === 'ride')
  const target = leg.type === 'walk' ? leg.to : leg.path[leg.path.length - 1]
  const dist = fix ? metres(fix, target) : null
  const near = dist != null && fix != null && fix.acc < 100 && dist < NEAR_M
  if (near && leg.type === 'ride' && alerted.current !== cur) {
    alerted.current = cur
    navigator.vibrate?.([200, 100, 200])
  }
  const fare = (l: Ride) => (l.regular == null || l.discounted == null ? '—' : formatPesos(discount ? l.discounted : l.regular))
  const modeName = (id: string) => modesById[id]?.name.en ?? id

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-2xl md:px-8" data-testid="guide-screen">
      <p className="text-sm text-ink-2">
        {guide.fromLabel} → <span className="font-semibold text-ink">{guide.toLabel}</span>
      </p>
      <p className="text-xs font-medium uppercase tracking-wide text-muted" data-testid="guide-progress">
        {t('guide.step', { n: cur + 1, total: legs.length })}
      </p>

      <Card className="flex flex-col gap-3" data-testid="guide-current">
        {leg.type === 'walk' ? (
          <>
            <p className="text-2xl font-bold text-ink">🚶 {t('guide.walk', { m: Math.round(leg.meters / 10) * 10 })}</p>
            <p className="text-base text-ink">
              {nextRide
                ? t('guide.walkToBoard', { place: guide.board[rides.indexOf(nextRide)] })
                : t('guide.walkToDest', { place: guide.toLabel })}
            </p>
            <p className="text-xs text-muted">{t('plan.walkApprox')}</p>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-xl font-bold text-ink">
              <span className="grid h-8 w-8 place-items-center rounded-full text-sm text-white" style={{ background: guide.colors[rideNo] }}>
                {rideNo + 1}
              </span>
              <span aria-hidden="true">{ICON[leg.line.kind]}</span>
              {leg.line.kind === 'jeep' || leg.line.kind === 'uv' ? leg.line.name : modeName(leg.line.modeId)}
            </p>
            {leg.fromStation ? (
              <p className="text-base text-ink">{leg.towards && t('plan.platform', { towards: leg.towards })}</p>
            ) : (
              <p className="text-base text-ink">{t('plan.signboard', { name: leg.line.name })}</p>
            )}
            <p className="text-base text-ink">▸ {t('guide.boardAt', { place: guide.board[rideNo] })}</p>
            <p className="text-lg font-semibold text-ink" data-testid="guide-alight">
              ■ {t('guide.alightAt', { place: guide.alight[rideNo] })}
            </p>
            <p className="text-sm text-ink-2">
              {guide.passenger}: <span className="font-bold tabular-nums text-ink">{fare(leg)}</span>
            </p>
            {leg.regular != null && <ChangeCalc fare={discount ? leg.discounted! : leg.regular} estimated={!leg.fromStation} />}
          </>
        )}
        {near && (
          <p role="alert" className="rounded-xl bg-accent px-3 py-2 text-base font-bold text-[#0b3d91]" data-testid="guide-near">
            {leg.type === 'ride' ? t('guide.nearAlight') : t('guide.nearTarget')}
          </p>
        )}
      </Card>

      {nextRide && leg.type === 'ride' && (
        <p className="text-sm text-ink-2" data-testid="guide-next">
          {t('guide.next', { place: guide.board[rides.indexOf(nextRide)] })}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setStep(cur - 1)} disabled={cur === 0} className="min-h-12 rounded-full border border-line-strong text-base font-medium text-ink disabled:opacity-40">
          ‹ {t('guide.prev')}
        </button>
        {cur < legs.length - 1 ? (
          <button type="button" onClick={() => setStep(cur + 1)} className="min-h-12 rounded-full bg-brand text-base font-semibold text-white" data-testid="guide-next-step">
            {t('guide.nextStep')} ›
          </button>
        ) : (
          <a href="#/" onClick={() => setStep(0)} className="flex min-h-12 items-center justify-center rounded-full bg-brand text-base font-semibold text-white" data-testid="guide-done">
            ✓ {t('guide.done')}
          </a>
        )}
      </div>

      <Card className="flex flex-col gap-2">
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-ink">
          <input type="checkbox" checked={gps} onChange={(e) => setGps(e.target.checked)} className="h-5 w-5" data-testid="guide-gps" />
          {t('guide.gps')}
        </label>
        {gps && !fix && !gpsError && <p className="text-xs text-muted">{t('ride.waiting')}</p>}
        {gpsError && <p className="text-xs text-red-700 dark:text-red-400">{t('ride.noGeo')}</p>}
        {fix && dist != null && (
          <p className="text-sm text-ink" data-testid="guide-distance">
            {t('guide.distance', { m: Math.round(dist / 10) * 10, acc: Math.round(fix.acc) })}
          </p>
        )}
        <p className="text-xs text-muted">{t('guide.gpsNote')}</p>
      </Card>
    </main>
  )
}
