import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPesos, increase, type Centavos, type Mode } from '../engine'
import { fmtKm, fmtPct, formatEffective } from '../lib/format'
import { rateSummary } from '../lib/rates'
import { shareText } from '../lib/share'
import type { FareBasis, InputSource } from '../lib/trip'
import { useApp } from '../state'
import { ReportOvercharge } from './ReportOvercharge'
import { Card } from './ui'

export interface FareCardProps {
  modeName: string
  tripLabel: string
  regular: Centavos
  discounted: Centavos
  previous?: { regular: Centavos; discounted: Centavos }
  /** Shown under the fares, e.g. "Charged as 5 km". */
  notes?: string[]
  warning?: string
  breakdown?: { label: string; value: Centavos }[]
  metered?: boolean
  showNoOld?: boolean
  /** e.g. "LTFRB Sep 28, 2026" or "DOTr MRT-3 Mar 23, 2026"; used in the share text. */
  sourceLabel?: string
  /** Offer the LTFRB 1342 hotline in the overcharge report (false for trains). */
  reportHotline?: boolean
  /** The fare mode: its own source, document and effective date are shown. */
  mode?: Mode
  basis: FareBasis
  /** Distance entered for a distance-based or metered fare, and where it came from. */
  km?: number
  inputSource?: InputSource
}

export function FareCard(p: FareCardProps) {
  const { t } = useTranslation()
  const { discount, manifest, lang, addLeg } = useApp()
  const [copied, setCopied] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [open, setOpen] = useState(false)
  const effective = p.mode?.effective ?? manifest.effective
  const authority = p.mode?.source ?? manifest.source
  const source = p.sourceLabel ?? `${authority} ${formatEffective(effective, lang)}`
  // Only a published station matrix gives an exact fare; a distance or a metered
  // fare is only as exact as the distance and time put in.
  const estimated = p.basis !== 'matrix'

  const primary = discount ? p.discounted : p.regular
  const secondary = discount ? p.regular : p.discounted
  const primaryLabel = discount ? t('fare.discounted') : t('fare.regular')
  const secondaryLabel = discount ? t('fare.regular') : t('fare.discounted')
  const prev = p.previous ? (discount ? p.previous.discounted : p.previous.regular) : undefined
  const inc = prev != null ? increase(primary, prev) : undefined

  const onShare = async () => {
    const text = t(p.metered ? 'fare.shareTextMetered' : 'fare.shareText', {
      mode: p.modeName,
      trip: p.tripLabel,
      regular: formatPesos(p.regular),
      discounted: formatPesos(p.discounted),
      source,
    })
    const r = await shareText(text)
    if (r === 'copied') {
      setCopied(t('fare.copied'))
      setTimeout(() => setCopied(null), 1500)
    }
  }

  const onAdd = () => {
    addLeg({
      modeName: p.modeName,
      tripLabel: p.tripLabel,
      regular: p.regular,
      discounted: p.discounted,
      source,
      modeId: p.mode?.id,
      basis: p.basis,
      km: p.km,
      inputSource: p.inputSource,
      effective,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <Card className="flex flex-col gap-3" data-testid="fare-card">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted" data-testid="fare-passenger">{primaryLabel}</p>
          <p
            className="font-bold tabular-nums leading-tight text-ink"
            style={{ fontSize: 'clamp(2rem, 11vw, 3rem)' }}
            data-testid="fare-primary"
          >
            {formatPesos(primary)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{secondaryLabel}</p>
          <p className="text-2xl font-semibold tabular-nums text-ink-2" data-testid="fare-secondary">
            {formatPesos(secondary)}
          </p>
        </div>
      </div>
      <p className="text-sm font-medium text-ink">{p.tripLabel}</p>
      <p className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="fare-basis">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${estimated ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200'}`}>
          {t(`basis.${p.basis}`)}
        </span>
        <span className="text-muted">
          {authority} · {t('basis.effective', { date: formatEffective(effective, lang) })}
        </span>
      </p>

      {p.warning && (
        <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          ⚠ {p.warning}
        </p>
      )}

      {p.notes?.map((n) => (
        <p key={n} className="text-xs text-ink-2" data-testid="fare-note">
          {n}
        </p>
      ))}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 items-center justify-between rounded-xl border border-line px-3 text-left text-sm font-medium text-brand"
        data-testid="fare-details-toggle"
      >
        {t('basis.details')}
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-xl bg-canvas p-3 text-sm" data-testid="fare-details">
          {p.mode && (
            <p>
              <span className="block text-xs font-medium uppercase tracking-wide text-muted">{t('rate.title')}</span>
              <span className="text-ink">{rateSummary(p.mode, discount, t)}</span>
            </p>
          )}
          {p.km != null && p.inputSource && (
            <p>
              <span className="block text-xs font-medium uppercase tracking-wide text-muted">{t('basis.distanceTitle')}</span>
              <span className="text-ink">
                {fmtKm(p.km)} km · {t(`basis.input.${p.inputSource}`)}
              </span>
            </p>
          )}
          {p.breakdown && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1" data-testid="breakdown">
              <dt className="col-span-2 text-xs font-medium uppercase tracking-wide text-muted">{t('fare.breakdown')}</dt>
              {p.breakdown.map((b) => (
                <div key={b.label} className="contents">
                  <dt className="text-ink-2">{b.label}</dt>
                  <dd className="text-right tabular-nums text-ink">{formatPesos(b.value)}</dd>
                </div>
              ))}
            </dl>
          )}
          {prev != null && inc && (
            <p className="text-ink-2" data-testid="fare-old">
              {t('fare.old')}: <span className="tabular-nums">{formatPesos(prev)}</span>{' '}
              <span className={`font-semibold tabular-nums ${inc.amount > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                {t('fare.increase', { amount: formatPesos(inc.amount, { sign: true }), pct: fmtPct(inc.pct) })}
              </span>
            </p>
          )}
          {prev == null && p.showNoOld && <p className="text-xs text-muted">{t('fare.noOld')}</p>}
          <p>
            <span className="block text-xs font-medium uppercase tracking-wide text-muted">{t('basis.sourceTitle')}</span>
            <span className="text-ink" data-testid="fare-source">
              {authority}
              {p.mode?.sourceDoc ? ` · ${p.mode.sourceDoc}` : ''} · {t('basis.effective', { date: formatEffective(effective, lang) })}
            </span>
          </p>
          <p className="text-xs text-muted">{t(`basis.limit.${p.basis}`)}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="min-h-11 rounded-full bg-brand px-4 text-sm font-semibold text-white"
          data-testid="trip-add"
        >
          {added ? t('trip.added') : `+ ${t('trip.add')}`}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="min-h-11 rounded-full border border-line-strong px-4 text-sm font-medium text-ink hover:bg-canvas"
        >
          {t('fare.share')}
        </button>
        {!reporting && (
          <button
            type="button"
            onClick={() => setReporting(true)}
            className="min-h-11 rounded-full border border-red-300 px-4 text-sm font-medium text-red-700 dark:border-red-800 dark:text-red-400"
            data-testid="report-open"
          >
            ⚠ {t('report.open')}
          </button>
        )}
        {copied && (
          <span role="status" className="text-sm text-green-700">
            {copied}
          </span>
        )}
      </div>
      {reporting && (
        <ReportOvercharge
          modeName={p.modeName}
          tripLabel={p.tripLabel}
          official={primary}
          officialLabel={primaryLabel}
          source={source}
          basisText={t(`basis.${p.basis}`)}
          estimated={estimated}
          hotline={p.reportHotline !== false}
          onClose={() => setReporting(false)}
        />
      )}
    </Card>
  )
}
