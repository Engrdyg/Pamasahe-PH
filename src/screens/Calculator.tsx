import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FareError,
  airportTaxiFare,
  destinationsFrom,
  distanceFare,
  formatPesos,
  matrixFare,
  taxiFare,
  tnvsFare,
  toCentavos,
  type Category,
  type DistanceMode,
  type MatrixMode,
  type MeteredMode,
  type Mode,
  type SteppedTaxiMode,
  type TimeDistanceTaxiMode,
  type TnvsMode,
} from '../engine'
import { FareCard } from '../components/FareCard'
import { RoutePicker } from '../components/RoutePicker'
import { RouteStrip } from '../components/RouteStrip'
import { Card, Chips, DiscountToggle, ErrorNote, NumberField, Select } from '../components/ui'
import { fmtKm, formatEffective, localized } from '../lib/format'
import { getPref, setPref } from '../lib/prefs'
import { useApp } from '../state'

const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s))

function useModeSelection(category: Category, modes: Mode[]) {
  const inCategory = useMemo(() => modes.filter((m) => m.category === category), [modes, category])
  const [modeId, setModeId] = useState(() => {
    const last = getPref('lastMode')
    return inCategory.some((m) => m.id === last) ? last! : (inCategory[0]?.id ?? '')
  })
  useEffect(() => {
    if (!inCategory.some((m) => m.id === modeId)) setModeId(inCategory[0]?.id ?? '')
  }, [inCategory, modeId])
  const select = (id: string) => {
    setModeId(id)
    setPref('lastMode', id)
    setPref('lastCategory', category)
  }
  return { inCategory, mode: inCategory.find((m) => m.id === modeId), select }
}

function errorText(t: (k: string) => string, e: unknown): string {
  return e instanceof FareError ? t(`fare.errors.${e.code}`) : String(e)
}

export function Calculator({ category }: { category: Category }) {
  const { t } = useTranslation()
  const { modes, lang } = useApp()
  const { inCategory, mode, select } = useModeSelection(category, modes)

  if (!mode) return <ErrorNote>{t('common.pending')}</ErrorNote>

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
      {inCategory.length > 1 && (
        <Chips
          label={t('tables.mode')}
          options={inCategory.map((m) => ({
            id: m.id,
            label: shortName(localized(m.name, lang)),
            disabled: m.status === 'pending_data',
          }))}
          value={mode.id}
          onChange={select}
        />
      )}
      <DiscountToggle compact />
      {mode.status === 'pending_data' ? (
        <ErrorNote>{t('common.pending')}</ErrorNote>
      ) : mode.method === 'MATRIX' ? (
        <MatrixCalc mode={mode} />
      ) : mode.method === 'METERED' ? (
        <MeteredCalc mode={mode} />
      ) : (
        <DistanceCalc mode={mode} />
      )}
      {mode.notes && <p className="text-xs text-muted">{localized(mode.notes, lang)}</p>}
    </main>
  )
}

/** "Provincial Bus · Deluxe" -> "Deluxe" for chips inside a category. */
const shortName = (n: string) => n.split(' · ').pop() ?? n

function DistanceCalc({ mode }: { mode: DistanceMode }) {
  const { t } = useTranslation()
  const { lang } = useApp()
  const range = mode.tableRange
  const [km, setKm] = useState(() => String(range?.minKm ?? 1))
  const kmNum = num(km)

  let body
  try {
    const f = distanceFare(mode, kmNum)
    const notes = [t('fare.chargedKm', { km: f.chargedKm })]
    body = (
      <FareCard
        modeName={localized(mode.name, lang)}
        tripLabel={`${fmtKm(kmNum)} km`}
        regular={f.regular}
        discounted={f.discounted}
        previous={f.previous}
        notes={notes}
        warning={f.beyondTable && range ? t('fare.beyondTable', { max: range.maxKm }) : undefined}
        showNoOld
      />
    )
  } catch (e) {
    body = <ErrorNote>{errorText(t, e)}</ErrorNote>
  }

  return (
    <>
      <Card>
        <NumberField
          label={t('input.distance')}
          value={km}
          onChange={setKm}
          min={range?.minKm ?? 1}
          max={range?.maxKm ?? 100}
          step={range?.stepKm ?? 1}
          slider
          unit={t('common.km')}
        />
      </Card>
      <RoutePicker onUse={(k) => setKm(k.toFixed(1))} />
      {body}
    </>
  )
}

function MatrixCalc({ mode }: { mode: MatrixMode }) {
  const { t } = useTranslation()
  const { lang } = useApp()
  const dirs = Object.keys(mode.directions)
  const ticketKind = mode.kind === 'ticket'
  const [ticket, setTicket] = useState(dirs[0])
  // One combined station list (order of the first direction, then any
  // stations that only exist in the other direction, in their own order).
  const stations = useMemo(() => {
    const out: string[] = []
    for (const d of dirs) for (const st of mode.directions[d].stations) if (!out.includes(st)) out.push(st)
    return out
  }, [mode, dirs])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Destinations reachable from `from` in either direction; the direction
  // is inferred from which matrix lists the destination after the origin.
  const dests = useMemo(() => {
    const m = new Map<string, string>()
    if (!from) return m
    for (const d of dirs) for (const st of destinationsFrom(mode, d, from)) if (!m.has(st)) m.set(st, d)
    return m
  }, [mode, dirs, from])
  const dir = ticketKind ? (to ? ticket : undefined) : dests.get(to)
  const sourceLabel = `${mode.source} ${formatEffective(mode.effective, lang)}`

  const changeFrom = (s: string) => {
    setFrom(s)
    setTo('')
  }

  let body = null
  if (from && to && dir) {
    try {
      const f = matrixFare(mode, dir, from, to)
      body = (
        <FareCard
          modeName={`${localized(mode.name, lang)} ${t(`input.${dir}`)}`}
          tripLabel={`${from} → ${to}`}
          regular={f.regular}
          discounted={f.discounted}
          previous={f.previous ? { regular: f.previous.regular, discounted: Math.round(f.previous.regular * 0.8) } : undefined}
          notes={[
            ticketKind ? `${t('input.ticket')}: ${t(`input.${dir}`)}` : `${t('input.direction')}: ${t(`input.${dir}`)}`,
            t('fare.sourceNote', { source: mode.source, date: formatEffective(mode.effective, lang) }),
          ]}
          sourceLabel={sourceLabel}
        />
      )
      body = (
        <>
          {body}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink">
              {t('busway.route')}{ticketKind ? '' : ` · ${t(`input.${dir}`)}`}
            </h2>
            <RouteStrip direction={mode.directions[dir]} from={from} to={to} />
          </Card>
        </>
      )
    } catch (e) {
      body = <ErrorNote>{errorText(t, e)}</ErrorNote>
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-4">
        {ticketKind && dirs.length > 1 && (
          <Chips label={t('input.ticket')} options={dirs.map((d) => ({ id: d, label: t(`input.${d}`) }))} value={ticket} onChange={setTicket} />
        )}
        <Select label={t('input.origin')} value={from} options={stations} onChange={changeFrom} placeholder="—" />
        {from && dests.size === 0 ? (
          <p className="text-sm text-ink-2">{t('input.noDestinations')}</p>
        ) : (
          <Select label={t('input.destination')} value={to} options={[...dests.keys()]} onChange={setTo} placeholder="—" />
        )}
        {!from && <p className="text-sm text-muted">{t('input.pickStations')}</p>}
        <p className="text-xs text-muted">
          {t('fare.minFare', {
            regular: formatPesos(toCentavos(mode.minFare.regular)),
            discounted: formatPesos(toCentavos(mode.minFare.discounted)),
          })}
        </p>
      </Card>
      {body}
    </>
  )
}

function MeteredCalc({ mode }: { mode: MeteredMode }) {
  const { t } = useTranslation()
  const { lang } = useApp()
  const stepped = mode.variant === 'stepped'
  const [dist, setDist] = useState(stepped ? '500' : '5')
  const [mins, setMins] = useState('10')
  const [pickup, setPickup] = useState('')
  const [vehicle, setVehicle] = useState(mode.variant === 'tnvs' ? mode.vehicles[0].id : '')

  const d = num(dist)
  const m = num(mins)
  const pk = pickup.trim() === '' ? 0 : num(pickup)

  let body
  try {
    const b =
      mode.variant === 'stepped'
        ? airportTaxiFare(mode as SteppedTaxiMode, d, m)
        : mode.variant === 'tnvs'
          ? tnvsFare(mode as TnvsMode, vehicle, d, m, pk)
          : taxiFare(mode as TimeDistanceTaxiMode, d, m)
    const breakdown = [
      { label: t('fare.flagDown'), value: b.flagDown },
      { label: t('fare.distanceCharge'), value: b.distance },
      { label: t('fare.timeCharge'), value: b.time },
      ...(mode.variant === 'tnvs' ? [{ label: t('fare.pickupCharge'), value: b.pickup }] : []),
      { label: t('fare.total'), value: b.total },
    ]
    const vehicleName =
      mode.variant === 'tnvs' ? ` (${localized(mode.vehicles.find((v) => v.id === vehicle)?.name, lang)})` : ''
    const trip = stepped ? `${d} m, ${m} min` : `${fmtKm(d)} km, ${m} min`
    body = (
      <FareCard
        modeName={localized(mode.name, lang) + vehicleName}
        tripLabel={trip}
        regular={b.total}
        discounted={b.discounted}
        breakdown={breakdown}
        metered
      />
    )
  } catch (e) {
    body = <ErrorNote>{errorText(t, e)}</ErrorNote>
  }

  return (
    <>
      <Card className="flex flex-col gap-4">
        {mode.variant === 'tnvs' && (
          <Chips
            label={t('input.vehicle')}
            options={mode.vehicles.map((v) => ({ id: v.id, label: localized(v.name, lang) }))}
            value={vehicle}
            onChange={setVehicle}
          />
        )}
        <NumberField
          label={stepped ? t('input.distanceMeters') : t('input.distance')}
          value={dist}
          onChange={setDist}
          min={0}
          step={stepped ? 100 : 0.1}
          unit={stepped ? t('common.m') : t('common.km')}
        />
        <NumberField label={t('input.time')} value={mins} onChange={setMins} min={0} step={1} unit={t('common.min')} />
        {mode.variant === 'tnvs' && (
          <NumberField label={t('input.pickup')} value={pickup} onChange={setPickup} min={0} step={0.1} unit={t('common.km')} />
        )}
      </Card>
      <RoutePicker
        onUse={(k, min) => {
          setDist(stepped ? String(Math.round(k * 1000)) : k.toFixed(1))
          setMins(String(min))
        }}
      />
      {body}
    </>
  )
}
