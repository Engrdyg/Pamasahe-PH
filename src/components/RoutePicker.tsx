import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchRoute, type LatLng, type RouteResult } from '../lib/routing'
import { Card, ErrorNote } from './ui'

const RouteMap = lazy(() => import('./RouteMap'))

/**
 * "Pin on map" helper: drop a pick-up and a drop-off pin (or use the phone's
 * location), get the road distance and time from OSRM, and hand them to the
 * calculator with one tap. Optional; typing a distance still works offline.
 */
export function RoutePicker({ onUse }: { onUse: (km: number, minutes: number) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState<LatLng | null>(null)
  const [to, setTo] = useState<LatLng | null>(null)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const solve = async (a: LatLng, b: LatLng) => {
    setBusy(true)
    setError(null)
    try {
      setRoute(await fetchRoute(a, b))
    } catch {
      setRoute(null)
      setError(t('map.error'))
    } finally {
      setBusy(false)
    }
  }

  const pick = (p: LatLng) => {
    if (!from || (from && to)) {
      setFrom(p)
      setTo(null)
      setRoute(null)
      return
    }
    setTo(p)
    void solve(from, p)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError(t('map.noGeo'))
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setFrom(p)
        setTo(null)
        setRoute(null)
      },
      () => {
        setBusy(false)
        setError(t('map.noGeo'))
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const reset = () => {
    setFrom(null)
    setTo(null)
    setRoute(null)
    setError(null)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-brand/40 bg-brand/5 px-4 text-sm font-medium text-brand"
        data-testid="map-open"
      >
        <span aria-hidden="true">📍</span> {t('map.open')}
      </button>
    )
  }

  return (
    <Card className="flex flex-col gap-3" data-testid="route-picker">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{t('map.title')}</h2>
        <button type="button" onClick={() => setOpen(false)} className="min-h-9 px-2 text-sm text-muted underline">
          {t('map.close')}
        </button>
      </div>
      <p className="text-xs text-ink-2">{!from ? t('map.hintFrom') : !to ? t('map.hintTo') : t('map.hintDone')}</p>
      <Suspense fallback={<div className="map-canvas grid place-items-center text-sm text-muted">{t('map.loadingMap')}</div>}>
        <RouteMap from={from} to={to} route={route} onPick={pick} />
      </Suspense>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useMyLocation} className="min-h-10 rounded-full border border-line-strong px-3 text-sm text-ink-2">
          {t('map.myLocation')}
        </button>
        <button type="button" onClick={reset} className="min-h-10 rounded-full border border-line-strong px-3 text-sm text-ink-2">
          {t('map.reset')}
        </button>
      </div>
      {busy && (
        <p role="status" className="text-sm text-muted">
          {t('map.loading')}
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      {route && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas-2 p-3">
          <p className="text-sm font-semibold tabular-nums text-ink" data-testid="route-result">
            {t('map.result', { km: route.km, min: route.minutes })}
          </p>
          <button
            type="button"
            onClick={() => {
              onUse(route.km, route.minutes)
              setOpen(false)
            }}
            className="min-h-10 rounded-full bg-brand px-4 text-sm font-semibold text-white"
            data-testid="route-use"
          >
            {t('map.use')}
          </button>
        </div>
      )}
      <p className="text-[11px] leading-snug text-muted">{t('map.estimate')}</p>
    </Card>
  )
}
