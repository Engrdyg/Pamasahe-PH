import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlaceSheet, type SheetPick } from '../components/PlaceSheet'
import { Card, ErrorNote } from '../components/ui'
import { formatPesos, type MatrixMode } from '../engine'
import { landmarkNear } from '../lib/geocode'
import type { SavedPlace } from '../lib/places'
import type { MapMark } from '../components/PlanMap'
import { KIND_COLOR, rideColors } from '../lib/planColors'
import type { LineKind, SlimItinerary, SlimLeg } from '../lib/planner'
import type { LatLng } from '../lib/routing'
import { usePlanner } from '../lib/usePlanner'
import { useWide } from '../lib/useMediaQuery'
import { useApp } from '../state'

const PlanMap = lazy(() => import('../components/PlanMap'))

const ICON: Record<LineKind, string> = { jeep: '🚙', uv: '🚐', rail: '🚆', busway: '🚌' }
const KINDS: LineKind[] = ['jeep', 'uv', 'rail', 'busway']
type Field = 'from' | 'to'

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
  const wide = useWide()
  // Keep the from/to fields pinned under the app's top bar while the results scroll.
  const [headerH, setHeaderH] = useState(0)
  useEffect(() => {
    const bar = document.querySelector('header')
    if (!bar || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setHeaderH(bar.getBoundingClientRect().height))
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])
  const [sheet, setSheet] = useState<Field | null>(null)
  const [pinFor, setPinFor] = useState<Field | null>(null)
  const [exclude, setExclude] = useState<LineKind[]>([])
  const [showModes, setShowModes] = useState(false)
  const excludeKey = exclude.join(',')
  // Space left for the map on phones: viewport minus everything above it and the bottom nav.
  const mapWrap = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState(() => window.innerHeight - 330)
  useEffect(() => {
    const measure = () => {
      const el = mapWrap.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const nav = document.querySelector('nav[aria-label="Main"]')?.getBoundingClientRect().height ?? 0
      const vh = window.visualViewport?.height ?? window.innerHeight
      setAvail(Math.floor(vh - top - nav))
    }
    measure()
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [headerH, showModes])

  // Rail and Busway stations as offline search suggestions
  const stations = useMemo<SavedPlace[]>(() => {
    const out: SavedPlace[] = []
    for (const id of ['lrt-1', 'lrt-2', 'mrt-3', 'edsa-busway']) {
      const m = modesById[id] as MatrixMode | undefined
      if (m?.method !== 'MATRIX') continue
      const short = id === 'edsa-busway' ? 'EDSA Busway' : m.name.en
      const seen = new Set<string>()
      for (const d of Object.values(m.directions)) {
        d.stations.forEach((st, i) => {
          const info = d.stationInfo?.[i]
          if (!info || seen.has(st)) return
          seen.add(st)
          out.push({ label: `${st} (${short})`, detail: t('plan.station'), lat: info.lat, lng: info.lng })
        })
      }
    }
    return out
  }, [modesById, t])

  useEffect(() => {
    setResults(null)
    if (!from || !to || planner.status !== 'ready') return
    const seq = ++latest.current
    setBusy(true)
    setError(null)
    planner
      .plan(from, to, exclude)
      .then((r) => {
        if (seq !== latest.current) return
        setResults(r)
        setSelected(0)
      })
      .catch(() => seq === latest.current && setError(t('plan.error')))
      .finally(() => seq === latest.current && setBusy(false))
  }, [from, to, planner.status, excludeKey])

  const fromRef = useRef(from)
  fromRef.current = from
  const toRef = useRef(to)
  toRef.current = to
  const setField = (f: Field, p: LatLng, text: string) => {
    if (f === 'from') {
      setFrom(p)
      setFromText(text)
    } else {
      setTo(p)
      setToText(text)
    }
  }
  // Name a dropped or dragged pin after the nearest landmark, if it is still there.
  const nameField = (f: Field, p: LatLng) => {
    void landmarkNear(p).then((name) => {
      if (!name) return
      const set = f === 'from' ? setFromText : setToText
      const cur = f === 'from' ? fromRef.current : toRef.current
      if (cur && cur.lat === p.lat && cur.lng === p.lng) set(name)
    })
  }
  const onMove = (f: Field, p: LatLng) => {
    setField(f, p, t('map.pinned'))
    nameField(f, p)
  }
  // Pin mode: the map moves under a fixed pin; confirm to use the spot.
  const [pinAt, setPinAt] = useState<LatLng | null>(null)
  const [pinName, setPinName] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (!pinFor || !pinAt) return
    let alive = true
    setPinName(undefined)
    const timer = window.setTimeout(() => void landmarkNear(pinAt).then((n) => alive && setPinName(n)), 250)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [pinFor, pinAt])
  const confirmPin = () => {
    if (!pinFor || !pinAt) return
    setField(pinFor, pinAt, pinName ?? t('map.pinned'))
    if (pinName === undefined) nameField(pinFor, pinAt) // name it once the landmark arrives
    setPinFor(null)
    setPinAt(null)
  }

  const useMyLocation = (f: Field) => {
    if (!navigator.geolocation) return setError(t('map.noGeo'))
    navigator.geolocation.getCurrentPosition(
      (pos) => setField(f, { lat: pos.coords.latitude, lng: pos.coords.longitude }, t('map.myLocationLabel')),
      () => setError(t('map.noGeo')),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  const onSheet = (f: Field, r: SheetPick) => {
    setSheet(null)
    if (r.kind === 'place') setField(f, { lat: r.place.lat, lng: r.place.lng }, r.place.label)
    else if (r.kind === 'here') useMyLocation(f)
    else setPinFor(f)
  }
  const clearAll = () => {
    setFrom(null)
    setTo(null)
    setFromText('')
    setToText('')
    setPinFor(null)
  }
  const toggleKind = (k: LineKind) => setExclude((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))
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
  // Map markers: get on (first ride), transfer (between rides), get off (last ride).
  const rides = it ? it.legs.filter((l): l is RideStep => l.type === 'ride') : []
  const colors = rideColors(rides.map((l) => l.line))
  const marks: MapMark[] = []
  rides.forEach((l, k) => {
    const start = l.path[0]
    const end = l.path[l.path.length - 1]
    const on = l.fromStation ? `${l.fromStation} station` : place(start)
    // On phones only the first and last stops get a text label; transfers are explained by the legend and the steps.
    marks.push({ ...start, type: k === 0 ? 'board' : 'transfer', color: colors[k], text: k === 0 ? t('plan.markBoard', { place: on }) : wide ? t('plan.markTransfer', { place: on }) : undefined })
    if (k === rides.length - 1) marks.push({ ...end, type: 'alight', color: colors[k], text: t('plan.markAlight', { place: l.toStation ? `${l.toStation} station` : place(end) }) })
    else marks.push({ ...end, type: 'transfer', color: colors[k] }) // get off here to change
  })
  const [legendOpen, setLegendOpen] = useState(wide)
  const short = (l: RideStep['line']) => (l.kind === 'rail' ? l.name : l.kind === 'busway' ? 'EDSA Busway' : l.name)
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

  // Phone: before results the map fills the space between the fields and the
  // bottom nav (measured); with results it takes about 55% of that.
  const mapPx = Math.max(320, avail)
  const mapHeight = wide ? 'calc(100vh - 120px)' : `${Math.round(results?.length ? Math.max(300, mapPx * 0.55) : mapPx)}px`
  const field = (f: Field) => {
    const text = f === 'from' ? fromText : toText
    return (
      <button
        type="button"
        onClick={() => setSheet(f)}
        className={`flex min-h-12 w-full items-center rounded-xl bg-canvas-2 px-4 text-left text-base ${text ? 'text-ink' : 'text-muted'}`}
        data-testid={`plan-${f}`}
      >
        <span className="truncate">{text || (f === 'from' ? t('map.from') : t('map.to'))}</span>
      </button>
    )
  }

  return (
    <main className="flex w-full flex-col md:mx-auto md:grid md:max-w-6xl md:grid-cols-[400px_1fr] md:items-start md:gap-6 md:px-8 md:py-6" data-testid="plan">
      <section
        className="sticky z-[700] border-b border-line bg-surface px-4 pb-2 pt-3 md:static md:col-start-1 md:rounded-2xl md:border md:shadow-sm"
        style={{ top: headerH }}
        data-testid="plan-header"
      >
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="flex flex-col items-center self-stretch py-5">
            <span className="h-3.5 w-3.5 rounded-full border-[3px] border-ink-2" />
            <span className="w-[3px] flex-1 bg-ink-2" />
            <span className="h-3.5 w-3.5 rounded-full bg-ink-2" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {field('from')}
            {field('to')}
          </div>
          <button type="button" onClick={swap} aria-label={t('plan.swap')} title={t('plan.swap')} className="flex min-h-12 min-w-12 items-center justify-center text-2xl text-ink-2" data-testid="plan-swap">
            ⇅
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowModes((v) => !v)}
            aria-expanded={showModes}
            className="inline-flex min-h-11 items-center gap-2 text-base text-ink"
            data-testid="plan-modes"
          >
            <span aria-hidden="true" className="text-green-600">
              🚍
            </span>
            {exclude.length ? t('plan.someModes', { n: KINDS.length - exclude.length }) : t('plan.allModes')}
            <span aria-hidden="true" className="text-muted">
              {showModes ? '▴' : '▾'}
            </span>
          </button>
          {(from || to) && (
            <button type="button" onClick={clearAll} className="min-h-11 px-2 text-sm text-muted underline">
              {t('plan.clear')}
            </button>
          )}
        </div>
        {showModes && (
          <div className="flex flex-wrap gap-2 pb-2" data-testid="plan-mode-chips">
            {KINDS.map((k) => {
              const on = !exclude.includes(k)
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleKind(k)}
                  disabled={on && exclude.length === KINDS.length - 1}
                  className={`min-h-10 rounded-full border px-3 text-sm font-medium ${on ? 'border-transparent text-white' : 'border-line-strong text-ink-2'}`}
                  style={on ? { background: KIND_COLOR[k] } : undefined}
                >
                  {ICON[k]} {t(`plan.kind.${k}`)}
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div ref={mapWrap} className="relative isolate z-0 md:sticky md:top-6 md:col-start-2 md:row-span-2 md:row-start-1 md:overflow-hidden md:rounded-2xl">
        {pinFor && (
          <>
            <div role="status" className="absolute left-14 right-3 top-3 z-[500] rounded-xl bg-ink px-4 py-2 text-center text-sm text-surface shadow-lg" data-testid="pin-banner">
              {t('plan.pinBanner', { field: pinFor === 'from' ? t('map.from') : t('map.to') })}
            </div>
            {/* Fixed pin in the middle of the map; its tip marks the spot. */}
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full" data-testid="center-pin">
              <span className={`plan-pin ${pinFor === 'from' ? 'plan-pin-a' : 'plan-pin-b'} plan-pin-lift`}>
                <b>{pinFor === 'from' ? 'A' : 'B'}</b>
              </span>
            </div>
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[499] h-2 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30" />
            <div className="absolute inset-x-3 bottom-3 z-[500] flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-xl" data-testid="pin-card">
              <p className="flex items-center gap-2 text-sm text-ink">
                <span aria-hidden="true">📍</span>
                <span className="truncate" data-testid="pin-name">
                  {pinName === undefined ? '…' : (pinName ?? t('map.pinned'))}
                </span>
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={confirmPin} className="min-h-11 flex-1 rounded-full bg-brand px-4 text-sm font-semibold text-white" data-testid="pin-confirm">
                  {t('plan.pinConfirm', { field: pinFor === 'from' ? t('plan.pinFrom') : t('plan.pinTo') })}
                </button>
                <button type="button" onClick={() => setPinFor(null)} className="min-h-11 rounded-full border border-line-strong px-4 text-sm text-ink-2">
                  {t('plan.cancel')}
                </button>
              </div>
            </div>
          </>
        )}
        <Suspense fallback={<div className="grid place-items-center bg-canvas-2 text-sm text-muted" style={{ height: mapHeight }}>{t('map.loadingMap')}</div>}>
          <PlanMap
            from={from}
            to={to}
            itinerary={it}
            colors={colors}
            marks={marks}
            onMove={onMove}
            pinMode={pinFor ? { start: (pinFor === 'from' ? from : to) ?? from ?? to, onCenter: setPinAt } : null}
            height={mapHeight}
          />
        </Suspense>
        {it && rides.length > 0 && !pinFor && (
          <div className="absolute bottom-6 left-2 z-[500] max-w-[70%] rounded-xl bg-surface/95 p-2 text-xs text-ink shadow-lg" data-testid="map-legend">
            <button type="button" onClick={() => setLegendOpen((v) => !v)} aria-expanded={legendOpen} className="flex w-full items-center justify-between gap-2 font-semibold">
              {t('plan.legend')} <span aria-hidden="true">{legendOpen ? '▾' : '▸'}</span>
            </button>
            {legendOpen && (
              <ul className="mt-1 flex flex-col gap-1">
                {rides.map((l, k) => (
                  <li key={k} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 w-5 shrink-0 rounded-full" style={{ background: colors[k] }} />
                    <span className="truncate">
                      {k + 1}. {ICON[l.line.kind]} {short(l.line)}
                    </span>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-0 w-5 shrink-0 border-t-[3px] border-dotted border-slate-600" />
                  {t('plan.legendWalk')}
                </li>
                <li className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-1">
                  <span className="inline-flex items-center gap-1">
                    <span className="mk mk-board mk-sm" style={{ ['--c' as string]: colors[0] }}><b>▲</b></span>
                    {t('plan.legendBoard')}
                  </span>
                  {rides.length > 1 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="mk mk-transfer mk-sm" style={{ ['--c' as string]: colors[1] }}><b>⇄</b></span>
                      {t('plan.legendTransfer')}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <span className="mk mk-alight mk-sm" style={{ ['--c' as string]: colors[colors.length - 1] }}><b>■</b></span>
                    {t('plan.legendAlight')}
                  </span>
                  {rides.some((l) => l.fromStation && l.path.length > 2) && (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 bg-white" style={{ borderColor: colors[rides.findIndex((l) => l.fromStation)] }} />
                      {t('plan.legendStop')}
                    </span>
                  )}
                </li>
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 md:col-start-1 md:px-0 md:py-0">
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
            const optRides = r.legs.filter((l): l is Exclude<SlimLeg, { type: 'walk' }> => l.type === 'ride')
            const optColors = rideColors(optRides.map((l) => l.line))
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
                  {optRides.map((l, k) => (
                    <span key={k} className="inline-flex items-center gap-1">
                      {k > 0 && <span className="text-muted">›</span>}
                      <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: optColors[k] }}>
                        {ICON[l.line.kind]} {l.line.kind === 'rail' ? l.line.name : l.line.kind === 'busway' ? 'Busway' : l.line.name}
                      </span>
                    </span>
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {r.rides <= 1 ? t('plan.direct') : t('plan.transfers', { count: r.rides - 1, n: r.rides - 1 })} · {t('plan.walk', { m: Math.round(r.walkMeters / 10) * 10 })}
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
                    <li key={i} className="flex gap-3 border-l-4 pl-2" style={{ borderColor: colors[rides.indexOf(l)] }}>
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
          {(results || wide) && (
            <p className="text-[11px] leading-snug text-muted">
              {(from || to) && `${t('plan.dragHint')} `}
              {t('plan.note', { n: planner.routes || '…' })} {t('plan.landmarkNote')}
            </p>
          )}
      </div>

      {sheet && (
        <PlaceSheet
          title={sheet === 'from' ? t('map.from') : t('map.to')}
          near={from ?? to}
          stations={stations}
          onPick={(r) => onSheet(sheet, r)}
          onClose={() => setSheet(null)}
        />
      )}
    </main>
  )
}
