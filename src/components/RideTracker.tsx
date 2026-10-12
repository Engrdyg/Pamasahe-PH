import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addFix, loadRide, rideKm, rideMinutes, saveRide, startRide, type RideState } from '../lib/ride'
import { Card, ErrorNote } from './ui'

const RouteMap = lazy(() => import('./RouteMap'))

type WakeLockSentinel = { release: () => Promise<void> }

/**
 * Strava-style ride tracker: start when you board, the phone's GPS records the
 * trip, distance and time are applied to the fare live, stop when you get off.
 * The ride survives a reload (localStorage) and keeps the screen awake while
 * tracking where the browser supports it.
 */
export function RideTracker({ onUse }: { onUse: (km: number, minutes: number) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(() => loadRide() != null)
  const [ride, setRide] = useState<RideState | null>(() => loadRide())
  const [now, setNow] = useState(() => Date.now())
  const [lastAcc, setLastAcc] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)
  const lastFixAt = useRef(0)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const onUseRef = useRef(onUse)
  onUseRef.current = onUse

  const tracking = Boolean(ride && !ride.endedAt)

  // Clock tick while tracking.
  useEffect(() => {
    if (!tracking) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [tracking])

  // GPS watch while tracking.
  useEffect(() => {
    if (!tracking) return
    if (!('geolocation' in navigator)) {
      setError(t('ride.noGeo'))
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastFixAt.current = Date.now()
        setError(null)
        setLastAcc(Math.round(pos.coords.accuracy))
        setRide((r) => {
          if (!r || r.endedAt) return r
          const next = addFix(r, { lat: pos.coords.latitude, lng: pos.coords.longitude, t: pos.timestamp || Date.now(), acc: pos.coords.accuracy })
          if (next !== r) saveRide(next)
          return next
        })
      },
      (err) => {
        // Only a real denial, or a long silence, is worth showing; transient
        // errors between fixes are normal while the phone searches for GPS.
        if (err.code === err.PERMISSION_DENIED) setError(t('ride.noGeo'))
        else if (Date.now() - lastFixAt.current > 20000) setError(t('ride.weak'))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    )
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [tracking, t])

  // Keep the screen on while tracking (re-acquire when the tab becomes visible again).
  useEffect(() => {
    if (!tracking) return
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } }
    const acquire = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === 'visible') wakeLock.current = await nav.wakeLock.request('screen')
      } catch {
        /* not allowed; the user keeps the screen on manually */
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      document.removeEventListener('visibilitychange', acquire)
      void wakeLock.current?.release()
      wakeLock.current = null
    }
  }, [tracking])

  // Apply live distance/time to the calculator.
  const km = ride ? rideKm(ride) : 0
  const minutes = ride ? rideMinutes(ride, now) : 0
  useEffect(() => {
    if (!ride || km <= 0) return
    onUseRef.current(km, Math.round(minutes))
  }, [ride, km, minutes])

  const start = useCallback(() => {
    setError(null)
    const r = startRide()
    saveRide(r)
    setRide(r)
    setNow(Date.now())
  }, [])
  const stop = useCallback(() => {
    setRide((r) => {
      if (!r) return r
      const done = { ...r, endedAt: Date.now() }
      saveRide(null)
      return done
    })
  }, [])
  const discard = useCallback(() => {
    saveRide(null)
    setRide(null)
    setLastAcc(null)
    setError(null)
  }, [])

  const mmss = (min: number) => {
    const s = Math.round(min * 60)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-brand/40 bg-brand/5 px-4 text-sm font-medium text-brand"
        data-testid="ride-open"
      >
        <span aria-hidden="true">🛰️</span> {t('ride.open')}
      </button>
    )
  }

  const first = ride?.points[0]
  const last = ride?.points[ride.points.length - 1]

  return (
    <Card className="flex w-full flex-col gap-3" data-testid="ride-tracker">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{t('ride.title')}</h2>
        {!tracking && (
          <button type="button" onClick={() => setOpen(false)} className="min-h-9 px-2 text-sm text-muted underline">
            {t('map.close')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-canvas-2 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('ride.distance')}</p>
          <p className="text-3xl font-bold tabular-nums text-ink" data-testid="ride-km">
            {ride ? km.toFixed(1) : '0.0'} <span className="text-base font-medium text-muted">km</span>
          </p>
        </div>
        <div className="rounded-xl bg-canvas-2 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('ride.elapsed')}</p>
          <p className="text-3xl font-bold tabular-nums text-ink" data-testid="ride-time">
            {ride ? mmss(minutes) : '0:00'}
          </p>
        </div>
      </div>

      {tracking && (
        <p role="status" className="flex items-center gap-2 text-xs text-ink-2">
          <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {ride!.points.length === 0
            ? t('ride.waiting')
            : t('ride.points', { n: ride!.points.length, acc: lastAcc ?? '–' })}
        </p>
      )}
      {ride?.endedAt && <p className="text-sm text-ink-2">{t('ride.done')}</p>}
      {error && <ErrorNote>{error}</ErrorNote>}

      {ride && ride.points.length > 0 && (
        <Suspense fallback={<div className="map-canvas" />}>
          <RouteMap
            from={first ? { lat: first.lat, lng: first.lng } : null}
            to={last && last !== first ? { lat: last.lat, lng: last.lng } : null}
            route={ride.points.length > 1 ? { km, minutes, geometry: ride.points.map((p) => [p.lat, p.lng] as [number, number]) } : null}
            onPick={() => {}}
          />
        </Suspense>
      )}

      <div className="flex flex-wrap gap-2">
        {!ride && (
          <button type="button" onClick={start} className="min-h-12 flex-1 rounded-full bg-green-600 px-5 text-base font-semibold text-white" data-testid="ride-start">
            ▶ {t('ride.start')}
          </button>
        )}
        {tracking && (
          <button type="button" onClick={stop} className="min-h-12 flex-1 rounded-full bg-red-600 px-5 text-base font-semibold text-white" data-testid="ride-stop">
            ■ {t('ride.stop')}
          </button>
        )}
        {ride?.endedAt && (
          <button type="button" onClick={discard} className="min-h-11 rounded-full border border-line-strong px-4 text-sm text-ink-2" data-testid="ride-discard">
            {t('ride.newRide')}
          </button>
        )}
        {tracking && (
          <button type="button" onClick={discard} className="min-h-11 rounded-full border border-line-strong px-4 text-sm text-ink-2">
            {t('ride.discard')}
          </button>
        )}
      </div>
      <p className="text-[11px] leading-snug text-muted">{t('ride.keepOn')}</p>
    </Card>
  )
}
