import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Place } from '../lib/geocode'
import { fetchRoute, type LatLng, type RouteResult } from '../lib/routing'
import { PlaceSearch } from './PlaceSearch'
import { Card, ErrorNote } from './ui'

const RouteMap = lazy(() => import('./RouteMap'))

/**
 * Trip planner: type a departure and an arrival (place search) or tap two pins
 * on the map, or use the phone's location for departure. The road distance
 * and time from OSRM are applied to the calculator as soon as a route is found,
 * so the fare appears without another tap. Typing a distance still works offline.
 */
export function RoutePicker({ onUse }: { onUse: (km: number, minutes: number) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState<LatLng | null>(null)
  const [to, setTo] = useState<LatLng | null>(null)
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)

  // Solve whenever both ends are known.
  useEffect(() => {
    if (!from || !to) {
      setRoute(null)
      return
    }
    const seq = ++latest.current
    setBusy(true)
    setError(null)
    fetchRoute(from, to)
      .then((r) => {
        if (seq !== latest.current) return
        setRoute(r)
        onUse(r.km, r.minutes)
      })
      .catch(() => {
        if (seq !== latest.current) return
        setRoute(null)
        setError(t('map.error'))
      })
      .finally(() => {
        if (seq === latest.current) setBusy(false)
      })
    // Re-solve only when an endpoint changes, not when the parent re-renders.
  }, [from, to])

  const pick = (p: LatLng) => {
    if (!from || (from && to)) {
      setFrom(p)
      setFromText(t('map.pinned'))
      setTo(null)
      setToText('')
      return
    }
    setTo(p)
    setToText(t('map.pinned'))
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError(t('map.noGeo'))
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        setFrom({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setFromText(t('map.myLocationLabel'))
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
    setFromText('')
    setToText('')
    setRoute(null)
    setError(null)
  }

  const selectFrom = (p: Place) => setFrom({ lat: p.lat, lng: p.lng })
  const selectTo = (p: Place) => setTo({ lat: p.lat, lng: p.lng })

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

      <PlaceSearch
        label={t('map.from')}
        value={fromText}
        onChange={(v) => {
          setFromText(v)
          if (from) setFrom(null)
        }}
        onSelect={selectFrom}
        near={from ?? to}
        testId="place-from"
        trailing={
          <button
            type="button"
            onClick={useMyLocation}
            aria-label={t('map.myLocation')}
            title={t('map.myLocation')}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line-strong text-lg"
          >
            <span aria-hidden="true">◎</span>
          </button>
        }
      />
      <PlaceSearch
        label={t('map.to')}
        value={toText}
        onChange={(v) => {
          setToText(v)
          if (to) setTo(null)
        }}
        onSelect={selectTo}
        near={from ?? to}
        testId="place-to"
      />
      <p className="text-xs text-ink-2">{!from ? t('map.hintFrom') : !to ? t('map.hintTo') : t('map.hintDone')}</p>

      <Suspense fallback={<div className="map-canvas grid place-items-center text-sm text-muted">{t('map.loadingMap')}</div>}>
        <RouteMap from={from} to={to} route={route} onPick={pick} />
      </Suspense>

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
            <span className="block text-xs font-normal text-muted">{t('map.applied')}</span>
          </p>
          <button type="button" onClick={reset} className="min-h-10 rounded-full border border-line-strong px-3 text-sm text-ink-2">
            {t('map.reset')}
          </button>
        </div>
      )}
      <p className="text-[11px] leading-snug text-muted">{t('map.estimate')}</p>
    </Card>
  )
}
