import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPesos, increase, type Centavos } from '../engine'
import { fmtPct, formatEffective } from '../lib/format'
import { shareText } from '../lib/share'
import { useApp } from '../state'
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
}

export function FareCard(p: FareCardProps) {
  const { t } = useTranslation()
  const { discount, manifest, lang } = useApp()
  const [copied, setCopied] = useState<string | null>(null)

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
      date: formatEffective(manifest.effective, lang),
    })
    const r = await shareText(text)
    if (r === 'copied') {
      setCopied(t('fare.copied'))
      setTimeout(() => setCopied(null), 1500)
    }
  }

  return (
    <Card className="flex flex-col gap-3" data-testid="fare-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{primaryLabel}</p>
          <p className="text-5xl font-bold tabular-nums leading-tight text-slate-900" data-testid="fare-primary">
            {formatPesos(primary)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{secondaryLabel}</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-600" data-testid="fare-secondary">
            {formatPesos(secondary)}
          </p>
        </div>
      </div>

      {p.warning && (
        <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠ {p.warning}
        </p>
      )}

      {prev != null && inc && (
        <p className="text-sm text-slate-700" data-testid="fare-old">
          {t('fare.old')}: <span className="tabular-nums">{formatPesos(prev)}</span>{' '}
          <span className={`font-semibold tabular-nums ${inc.amount > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {t('fare.increase', { amount: formatPesos(inc.amount, { sign: true }), pct: fmtPct(inc.pct) })}
          </span>
        </p>
      )}
      {prev == null && p.showNoOld && <p className="text-xs text-slate-500">{t('fare.noOld')}</p>}

      {p.breakdown && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-slate-50 p-3 text-sm" data-testid="breakdown">
          <dt className="col-span-2 mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('fare.breakdown')}
          </dt>
          {p.breakdown.map((b) => (
            <div key={b.label} className="contents">
              <dt className="text-slate-600">{b.label}</dt>
              <dd className="text-right tabular-nums text-slate-900">{formatPesos(b.value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {p.notes?.map((n) => (
        <p key={n} className="text-xs text-slate-500">
          {n}
        </p>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onShare}
          className="min-h-11 rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t('fare.share')}
        </button>
        {copied && (
          <span role="status" className="text-sm text-green-700">
            {copied}
          </span>
        )}
      </div>
    </Card>
  )
}
