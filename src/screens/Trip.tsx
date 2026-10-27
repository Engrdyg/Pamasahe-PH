import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui'
import { formatPesos } from '../engine'
import { shareText } from '../lib/share'
import { tripTotals } from '../lib/trip'
import { useApp } from '../state'

export function Trip() {
  const { t } = useTranslation()
  const { trip, removeLeg, clearTrip, discount } = useApp()
  const [copied, setCopied] = useState(false)
  const totals = tripTotals(trip)
  const primary = discount ? totals.discounted : totals.regular
  const secondary = discount ? totals.regular : totals.discounted

  const share = async () => {
    const lines = [
      t('trip.shareText', { n: trip.length, total: formatPesos(totals.regular), disc: formatPesos(totals.discounted) }),
      ...trip.map((l, i) => `${i + 1}. ${l.modeName}, ${l.tripLabel}: ${formatPesos(l.regular)} (${formatPesos(l.discounted)})`),
      'bayad-po.vercel.app',
    ]
    if ((await shareText(lines.join('\n'))) === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-3xl md:px-8 md:py-6" data-testid="trip-screen">
      {trip.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-2">{t('trip.empty')}</p>
          <a href="#/" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
            {t('trip.addMore')}
          </a>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t('trip.total')} · {discount ? t('fare.discounted') : t('fare.regular')}
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
            {trip.map((l, i) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3" data-testid="trip-leg">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{l.modeName}</p>
                  <p className="truncate text-xs text-muted">{l.tripLabel} · {l.source}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold tabular-nums text-ink">{formatPesos(discount ? l.discounted : l.regular)}</p>
                  <button type="button" onClick={() => removeLeg(l.id)} className="text-xs text-muted underline">
                    {t('trip.remove')}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <a href="#/" className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white" data-testid="trip-add-more">
              + {t('trip.addMore')}
            </a>
            <button type="button" onClick={share} className="min-h-11 rounded-full border border-line-strong px-4 text-sm font-medium text-ink">
              {t('trip.share')}
            </button>
            <button type="button" onClick={clearTrip} className="min-h-11 rounded-full border border-line-strong px-4 text-sm text-ink-2">
              {t('trip.clear')}
            </button>
            {copied && <span role="status" className="self-center text-sm text-green-700">{t('fare.copied')}</span>}
          </div>
        </>
      )}
    </main>
  )
}
