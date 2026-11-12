import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui'
import { formatPesos } from '../engine'
import { formatEffective } from '../lib/format'
import { shareText } from '../lib/share'
import { editLegKm, isStale, newLegId, recalcLeg, tripTotals, type TripLeg } from '../lib/trip'
import { useApp } from '../state'

export function Trip() {
  const { t } = useTranslation()
  const { trip, removeLeg, clearTrip, setTripLegs, updateLeg, discount, passenger, manifest, modesById, lang } = useApp()
  const [copied, setCopied] = useState(false)
  // Last removal or clear, so it can be undone.
  const [undo, setUndo] = useState<{ legs: TripLeg[]; text: string } | null>(null)
  const totals = tripTotals(trip)
  const primary = discount ? totals.discounted : totals.regular
  const secondary = discount ? totals.regular : totals.discounted

  const share = async () => {
    const lines = [
      t('trip.shareText', { n: trip.length, total: formatPesos(totals.regular), disc: formatPesos(totals.discounted) }),
      ...trip.map((l, i) => `${i + 1}. ${l.modeName}, ${l.tripLabel}: ${formatPesos(l.regular)} (${formatPesos(l.discounted)})`),
      t('trip.shareBasis'),
      'bayad-po.vercel.app',
    ]
    if ((await shareText(lines.join('\n'))) === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  const remove = (l: TripLeg) => {
    setUndo({ legs: trip, text: t('trip.removed', { mode: l.modeName }) })
    removeLeg(l.id)
  }
  const clear = () => {
    setUndo({ legs: trip, text: t('trip.cleared') })
    clearTrip()
  }
  // Editing the distance of a distance-based leg re-prices it with current data.
  const [editing, setEditing] = useState<{ id: string; km: string } | null>(null)
  const saveEdit = (l: TripLeg) => {
    if (!editing) return
    const patch = editLegKm(l, Number(editing.km), modesById)
    if (!patch) return
    updateLeg(l.id, { ...patch, fareVersion: manifest.version })
    setEditing(null)
  }
  const duplicate = (i: number) => {
    const next = [...trip]
    next.splice(i + 1, 0, { ...trip[i], id: newLegId(), addedAt: Date.now() })
    setTripLegs(next)
  }
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= trip.length) return
    const next = [...trip]
    ;[next[i], next[j]] = [next[j], next[i]]
    setTripLegs(next)
  }

  const undoBar = undo && (
    <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-2 text-sm text-canvas" data-testid="trip-undo">
      <span>{undo.text}</span>
      <button
        type="button"
        onClick={() => {
          setTripLegs(undo.legs)
          setUndo(null)
        }}
        className="min-h-10 px-2 font-semibold text-accent underline"
      >
        {t('trip.undo')}
      </button>
    </div>
  )

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-3xl md:px-8 md:py-6" data-testid="trip-screen">
      {undoBar}
      {trip.length === 0 ? (
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">{t('trip.empty')}</p>
          <div className="flex flex-wrap gap-2">
            <a href="#/plan" className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
              {t('trip.planRoute')}
            </a>
            <a href="#/fares" className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-semibold text-ink">
              {t('trip.addMore')}
            </a>
          </div>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t('trip.total')} · {t(`passenger.${passenger}`)}
            </p>
            <p className="font-bold tabular-nums text-ink" style={{ fontSize: 'clamp(2rem, 11vw, 3rem)' }} data-testid="trip-total">
              {formatPesos(primary)}
            </p>
            <p className="text-sm tabular-nums text-ink-2">
              {discount ? t('fare.regular') : t('fare.discounted')}: {formatPesos(secondary)}
            </p>
            <p className="text-xs text-muted">{t('trip.note')}</p>
          </Card>
          <ol className="flex flex-col gap-2" aria-label={t('trip.legs')}>
            {trip.map((l, i) => {
              const stale = isStale(l, manifest.version, modesById)
              const now = stale ? recalcLeg(l, modesById) : null
              return (
                <li key={l.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3" data-testid="trip-leg">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{l.modeName}</p>
                      <p className="truncate text-xs text-muted">
                        {l.tripLabel}
                        {l.basis && ` · ${t(`basis.${l.basis}`)}`}
                      </p>
                      <p className="truncate text-[11px] text-muted" data-testid="trip-leg-source">
                        {l.source}
                        {l.fareVersion && ` · ${t('trip.dataVersion', { v: l.fareVersion })}`}
                      </p>
                    </div>
                    <p className="text-base font-bold tabular-nums text-ink">{formatPesos(discount ? l.discounted : l.regular)}</p>
                  </div>
                  {stale && (
                    <div className="flex flex-col gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200" data-testid="trip-stale">
                      <span>
                        {t('trip.stale', { date: l.effective ? formatEffective(l.effective, lang) : '—' })}
                        {now && ` ${t('trip.nowFare', { fare: formatPesos(discount ? now.discounted : now.regular) })}`}
                      </span>
                      {now && (
                        <button
                          type="button"
                          onClick={() =>
                            updateLeg(l.id, { ...now, fareVersion: manifest.version, effective: l.modeId ? modesById[l.modeId]?.effective : l.effective })
                          }
                          className="self-start font-semibold underline"
                        >
                          {t('trip.useCurrent')}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('trip.moveUp', { n: i + 1 })} className="min-h-9 min-w-9 rounded-full border border-line text-ink-2 disabled:opacity-40">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === trip.length - 1} aria-label={t('trip.moveDown', { n: i + 1 })} className="min-h-9 min-w-9 rounded-full border border-line text-ink-2 disabled:opacity-40">
                      ↓
                    </button>
                    {l.basis === 'distance' && l.km != null && (
                      <button type="button" onClick={() => setEditing({ id: l.id, km: String(l.km) })} className="min-h-9 px-2 text-brand underline" data-testid="trip-edit">
                        {t('trip.edit')}
                      </button>
                    )}
                    <button type="button" onClick={() => duplicate(i)} className="min-h-9 px-2 text-brand underline" data-testid="trip-duplicate">
                      {t('trip.duplicate')}
                    </button>
                    <button type="button" onClick={() => remove(l)} className="ml-auto min-h-9 px-2 text-muted underline" data-testid="trip-remove">
                      {t('trip.remove')}
                    </button>
                  </div>
                  {editing?.id === l.id && (
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        saveEdit(l)
                      }}
                    >
                      <label className="flex flex-col text-xs text-ink-2">
                        {t('input.distance')}
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0.1}
                          step={0.1}
                          value={editing.km}
                          onChange={(e) => setEditing({ id: l.id, km: e.target.value })}
                          className="min-h-11 w-28 rounded-xl border border-line-strong bg-surface px-3 text-base text-ink"
                          data-testid="trip-edit-km"
                        />
                      </label>
                      <button type="submit" className="min-h-11 rounded-full bg-brand px-4 text-sm font-semibold text-white" data-testid="trip-edit-save">
                        {t('trip.save')}
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="min-h-11 px-2 text-sm text-muted underline">
                        {t('plan.cancel')}
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ol>
          <div className="flex flex-wrap gap-2">
            <a href="#/fares" className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white" data-testid="trip-add-more">
              + {t('trip.addMore')}
            </a>
            <button type="button" onClick={share} className="min-h-11 rounded-full border border-line-strong px-4 text-sm font-medium text-ink">
              {t('trip.share')}
            </button>
            <button type="button" onClick={clear} className="min-h-11 rounded-full border border-line-strong px-4 text-sm text-ink-2" data-testid="trip-clear">
              {t('trip.clear')}
            </button>
            {copied && <span role="status" className="self-center text-sm text-green-700">{t('fare.copied')}</span>}
          </div>
        </>
      )}
    </main>
  )
}
