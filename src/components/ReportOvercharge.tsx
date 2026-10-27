import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPesos, type Centavos } from '../engine'
import { fmtPct } from '../lib/format'
import { buildReport, overcharge, parseAmount } from '../lib/report'
import { shareText } from '../lib/share'
import { useApp } from '../state'

/** Inline overcharge report panel inside a fare card. */
export function ReportOvercharge({
  modeName,
  tripLabel,
  official,
  officialLabel,
  source,
  hotline = true,
  onClose,
}: {
  modeName: string
  tripLabel: string
  official: Centavos
  officialLabel: string
  source: string
  hotline?: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { lang } = useApp()
  const id = useId()
  const [charged, setCharged] = useState('')
  const [plate, setPlate] = useState('')
  const [place, setPlace] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const paid = parseAmount(charged)
  const valid = Number.isFinite(paid)
  const over = valid ? overcharge(official, paid) : null
  const isOver = over != null && over.amount > 0
  const text = isOver
    ? buildReport({ modeName, tripLabel, official, officialLabel, charged: paid, plate, place, notes, when: new Date(), source, lang })
    : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(t('report.copied'))
    } catch {
      setStatus(null)
    }
  }
  const share = async () => {
    const r = await shareText(text)
    if (r === 'copied') setStatus(t('report.copied'))
  }

  const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30'

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900 dark:bg-red-950/30" data-testid="report-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{t('report.title')}</h3>
        <button type="button" onClick={onClose} className="min-h-9 px-2 text-sm text-muted underline">
          {t('report.close')}
        </button>
      </div>
      <p className="text-sm text-ink-2">
        {t('report.official')}: <span className="font-semibold tabular-nums text-ink">{formatPesos(official)}</span> ({officialLabel})
      </p>
      <label htmlFor={`${id}-c`} className="text-sm font-medium text-ink-2">{t('report.charged')}</label>
      <input id={`${id}-c`} inputMode="decimal" value={charged} onChange={(e) => setCharged(e.target.value)} className={`${field} text-xl font-semibold tabular-nums`} data-testid="report-charged" />
      {!valid && <p className="text-xs text-muted">{t('report.enterAmount')}</p>}
      {valid && !isOver && <p role="status" className="text-sm text-green-700 dark:text-green-400">{t('report.notOver')}</p>}
      {isOver && (
        <p role="status" className="text-base font-bold tabular-nums text-red-700 dark:text-red-400" data-testid="report-over">
          {t('report.over', { amount: formatPesos(over!.amount), pct: fmtPct(over!.pct) })}
        </p>
      )}
      <label htmlFor={`${id}-p`} className="text-sm font-medium text-ink-2">{t('report.plate')}</label>
      <input id={`${id}-p`} value={plate} onChange={(e) => setPlate(e.target.value)} autoCapitalize="characters" className={field} data-testid="report-plate" />
      <label htmlFor={`${id}-w`} className="text-sm font-medium text-ink-2">{t('report.place')}</label>
      <input id={`${id}-w`} value={place} onChange={(e) => setPlace(e.target.value)} className={field} />
      <label htmlFor={`${id}-n`} className="text-sm font-medium text-ink-2">{t('report.notes')}</label>
      <textarea id={`${id}-n`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${field} py-2`} />

      {isOver && (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('report.preview')}</p>
          <pre className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-xs text-ink-2" data-testid="report-text">{text}</pre>
          <div className="flex flex-wrap gap-2">
            {hotline && (
              <a href="tel:1342" className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-4 text-sm font-semibold text-white">
                📞 {t('report.call')}
              </a>
            )}
            <button type="button" onClick={copy} className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink" data-testid="report-copy">
              {t('report.copy')}
            </button>
            <button type="button" onClick={share} className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink">
              {t('report.share')}
            </button>
          </div>
          {status && <p role="status" className="text-sm text-green-700 dark:text-green-400">{status}</p>}
          <p className="text-xs text-muted">{hotline ? t('report.tip') : t('report.railNote')}</p>
        </>
      )}
    </div>
  )
}
