import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlaceSearch } from '../components/PlaceSearch'
import { Card, ErrorNote } from '../components/ui'
import { formatPesos } from '../engine'
import { landmarkNear, type Place } from '../lib/geocode'
import { KIND_COLOR } from '../lib/planColors'
import type { LineKind, SlimItinerary, SlimLeg } from '../lib/planner'
import type { LatLng } from '../lib/routing'
import { usePlanner } from '../lib/usePlanner'
import { useApp } from '../state'

const PlanMap = lazy(() => import('../components/PlanMap'))

const ICON: Record<LineKind, string> = { jeep: '🚙', uv: '🚐', rail: '🚆', busway: '🚌' }

function parsePoint(s?: string): LatLng | null {
  const m = s?.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/)
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null
}
const km = (m: number) => (m / 1000).toFixed(1)
const pkey = (p: LatLng) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
type RideStep = Exclude<SlimLeg, { type: 'walk' }>
const mins = (n: number) => Math.max(1, Math.round(n))

/**
 * Route planner (NCR): pick a departure and an arrival; the app finds jeepney,
 * UV Express, rail and Busway combinations with up to two transfers and the
 * official fare of each ride. Runs on the device from public/routes/ncr.json.
 * `#/plan/<lat,lng>/<lat,lng>` opens with both ends filled in.
 */
export function Plan({ fromArg, toArg }: { fromArg?: string; toArg?: string }) {
  const { t } = useTranslation()
  const { modesById, discount, lang, addLeg } = useApp()
  const planner = usePlanner(modesById)
  const [from, setFrom] = useState<LatLng | null>(() => parsePoint(fromArg))
  const [to, setTo] = useState<LatLng | null>(() => parsePoint(toArg))
  const [fromText, setFromText] = useState(() => (parsePoint(fromArg) ? t('map.pinned') : ''))
  const [toText, setToText] = useState(() => (parsePoint(toArg) ? t('map.pinned') : ''))
  const [results, setResults] = useState<SlimItinerary[] | null>(null)
  const [selected, setSelected] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const latest = useRef(0)

  useEffect(() => {
    setResults(null)
    if (!from || !to || planner.status !== 'ready') return
    const seq = ++latest.current
    setBusy(true)
    setError(null)
    planner
      .plan(from, to)
      .then((r) => {
        if (seq !== latest.current) return
        setResults(r)
        setSelected(0)
      })
      .catch(() => seq === latest.current && setError(t('plan.error')))
      .finally(() => seq === latest.current && setBusy(false))
  }, [from, to, planner.status])

  const pick = (p: LatLng) => {
    if (!from || (from && to)) {
      setFrom(p)
      setFromText(t('map.pinned'))
      setTo(null)
      setToText('')
    } else {
      setTo(p)
      setToText(t('map.pinned'))
    }
  }
  const useMyLocation = () => {
    if (!navigator.geolocation) return setError(t('map.noGeo'))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFrom({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setFromText(t('map.myLocationLabel'))
      },
      () => setError(t('map.noGeo')),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  const swap = () => {
    setFrom(to)
    setTo(from)
    setFromText(toText)
    setToText(fromText)
  }

  const modeName = (id: string) => modesById[id]?.name[lang] ?? id
  const fare = (r: number | null, d: number | null) => (r == null || d == null ? '—' : formatPesos(discount ? d : r))
  const it = results?.[selected] ?? null

  // Landmark / street names for where to get on and off (Photon reverse
  // geocoding, looked up only for the itinerary being shown).
  const [places, setPlaces] = useState<Record<string, string | null>>({})
  const typedDest = toText && toText !== t('map.pinned') && toText !== t('map.myLocationLabel') ? toText : null
  useEffect(() => {
    if (!it) return
    const pts: LatLng[] = []
    for (const l of it.legs) if (l.type === 'ride' && !l.fromStation) pts.push(l.path[0], l.path[l.path.length - 1])
    if (!typedDest && to) pts.push(to)
    let alive = true
    for (const p of pts) {
      const k = pkey(p)
      void landmarkNear(p).then((name) => alive && setPlaces((cur) => (cur[k] === name ? cur : { ...cur, [k]: name })))
    }
    return () => {
      alive = false
    }
  }, [it, to, typedDest])
  const place = (p: LatLng) => {
    const v = places[pkey(p)]
    return v === undefined ? '…' : (v ?? t('plan.thePin'))
  }
  const walkText = (i: number, meters: number, minutes: number) => {
    const m = Math.round(meters / 10) * 10
    const min = mins(minutes)
    const next = it?.legs[i + 1] as RideStep | undefined
    if (!next) return t('plan.walkTo', { m, min, place: typedDest ?? (to ? place(to) : '') })
    if (next.fromStation) return t('plan.walkToStation', { m, min, station: next.fromStation })
    return t('plan.walkToStop', { m, min, place: place(next.path[0]) })
  }

  const legLabel = (l: Exclude<SlimLeg, { type: 'walk' }>) =>
    l.fromStation ? `${l.fromStation} → ${l.toStation}` : `${km(l.meters)} km`

  const addAll = () => {
    if (!it) return
    for (const l of it.legs) {
      if (l.type !== 'ride' || l.regular == null || l.discounted == null) continue
      addLeg({
        modeName: l.line.kind === 'jeep' || l.line.kind === 'uv' ? `${modeName(l.line.modeId)} (${l.line.name})` : modeName(l.line.modeId),
        tripLabel: legLabel(l),
        regular: l.regular,
        discounted: l.discounted,
        source: t('plan.sourceShort'),
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-6xl md:px-8 md:py-6" data-testid="plan">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-6">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <PlaceSearch
              label={t('map.from')}
              value={fromText}
              onChange={(v) => {
                setFromText(v)
                if (from) setFrom(null)
              }}
              onSelect={(p: Place) => setFrom({ lat: p.lat, lng: p.lng })}
              near={from ?? to}
              testId="plan-from"
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
              onSelect={(p: Place) => setTo({ lat: p.lat, lng: p.lng })}
              near={from ?? to}
              testId="plan-to"
              trailing={
                <button
                  type="button"
                  onClick={swap}
                  aria-label={t('plan.swap')}
                  title={t('plan.swap')}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line-strong text-lg"
                >
                  <span aria-hidden="true">⇅</span>
                </button>
              }
            />
            <p className="text-xs text-ink-2">{!from ? t('map.hintFrom') : !to ? t('map.hintTo') : t('plan.hintDone')}</p>
          </Card>

          <Suspense fallback={<div className="map-canvas grid place-items-center text-sm text-muted">{t('map.loadingMap')}</div>}>
            <PlanMap from={from} to={to} itinerary={it} onPick={pick} />
          </Suspense>
        </div>

        <div className="flex flex-col gap-3">
          {planner.status === 'loading' && (
            <p role="status" className="text-sm text-muted">
              {t('plan.loadingData')}
            </p>
          )}
          {planner.status === 'error' && <ErrorNote>{t('plan.dataError')}</ErrorNote>}
          {busy && (
            <p role="status" className="text-sm text-muted">
              {t('plan.searching')}
            </p>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          {results && results.length === 0 && (
            <Card>
              <p className="text-sm text-ink-2" data-testid="plan-none">
                {t('plan.none')}
              </p>
            </Card>
          )}

          {results?.map((r, i) => {
            const rides = r.legs.filter((l): l is Exclude<SlimLeg, { type: 'walk' }> => l.type === 'ride')
            const on = i === selected
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={on}
                className={`flex flex-col gap-2 rounded-2xl border bg-surface p-4 text-left shadow-sm ${on ? 'border-brand ring-2 ring-brand/30' : 'border-line'}`}
                data-testid="plan-option"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-2xl font-bold tabular-nums text-ink" data-testid="plan-fare">
                    {r.rides === 0 ? t('plan.walkOnly') : formatPesos(discount ? r.discounted : r.regular)}
                    {r.fareIncomplete && '+'}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-ink-2">≈ {t('plan.minutes', { n: mins(r.minutes) })}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {rides.map((l, k) => (
                    <span key={k} className="inline-flex items-center gap-1">
                      {k > 0 && <span className="text-muted">›</span>}
                      <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: KIND_COLOR[l.line.kind] }}>
                        {ICON[l.line.kind]} {l.line.kind === 'rail' ? l.line.name : l.line.kind === 'busway' ? 'Busway' : l.line.name}
                      </span>
                    </span>
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {r.rides <= 1 ? t('plan.direct') : t('plan.transfers', { n: r.rides - 1 })} · {t('plan.walk', { m: Math.round(r.walkMeters / 10) * 10 })}
                </span>
              </button>
            )
          })}

          {it && it.rides > 0 && (
            <Card className="flex flex-col gap-3" data-testid="plan-steps">
              <h2 className="text-sm font-semibold text-ink">{t('plan.steps')}</h2>
              <ol className="flex flex-col gap-3">
                {it.legs.map((l, i) =>
                  l.type === 'walk' ? (
                    <li key={i} className="flex gap-3 text-sm text-ink-2">
                      <span aria-hidden="true">🚶</span>
                      <span data-testid="plan-walk">{walkText(i, l.meters, l.minutes)}</span>
                    </li>
                  ) : (
                    <li key={i} className="flex gap-3">
                      <span aria-hidden="true" className="text-lg">
                        {ICON[l.line.kind]}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-ink">
                          {modeName(l.line.modeId)}
                          {(l.line.kind === 'jeep' || l.line.kind === 'uv') && <span className="font-normal text-ink-2">: {l.line.name}</span>}
                        </span>
                        {!l.fromStation && (
                          <span className="flex flex-col text-xs text-ink" data-testid="plan-board">
                            <span>▸ {t('plan.board', { place: place(l.path[0]) })}</span>
                            <span>▸ {t('plan.alight', { place: place(l.path[l.path.length - 1]) })}</span>
                          </span>
                        )}
                        <span className="text-xs text-ink-2">
                          {legLabel(l)} · ≈ {t('plan.minutes', { n: mins(l.minutes) })}
                          {l.line.mc && <span className="text-muted"> · {l.line.mc}</span>}
                        </span>
                        {l.alt && (
                          <span className="text-xs text-muted">
                            {t('plan.altFare', { mode: modeName(l.alt.modeId), fare: formatPesos(discount ? l.alt.discounted : l.alt.regular) })}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold tabular-nums text-ink">{fare(l.regular, l.discounted)}</span>
                    </li>
                  ),
                )}
              </ol>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-sm text-ink-2">{discount ? t('fare.discounted') : t('fare.regular')}</span>
                <span className="text-xl font-bold tabular-nums text-ink" data-testid="plan-total">
                  {formatPesos(discount ? it.discounted : it.regular)}
                </span>
              </div>
              <button type="button" onClick={addAll} className="min-h-11 self-start rounded-full bg-brand px-4 text-sm font-semibold text-white" data-testid="plan-add">
                {added ? t('trip.added') : `+ ${t('plan.addAll')}`}
              </button>
            </Card>
          )}
          <p className="text-[11px] leading-snug text-muted">
            {t('plan.note', { n: planner.routes || '…' })} {t('plan.landmarkNote')}
          </p>
        </div>
      </div>
    </main>
  )
}
