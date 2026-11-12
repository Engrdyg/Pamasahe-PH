import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ISSUE_KINDS, issueUrl, type IssueKind } from '../lib/feedback'
import type { LatLng } from '../lib/routing'

/**
 * Route-issue feedback for one ride. Prepares a GitHub issue in the browser
 * (the project's public issue tracker); nothing is sent from the app, and the
 * place is included only when the person ticks it.
 */
export function RouteFeedback({ route, mc, place, onClose }: { route: string; mc?: string; place?: LatLng; onClose: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  const [kind, setKind] = useState<IssueKind>('boarding')
  const [details, setDetails] = useState('')
  const [withPlace, setWithPlace] = useState(false)
  const first = useRef<HTMLSelectElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    opener.current = document.activeElement
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      ;(opener.current as HTMLElement | null)?.focus?.()
    }
  }, [onClose])

  const url = issueUrl({ kind, kindLabel: t(`feedback.kind.${kind}`), route, mc, details, place: withPlace ? place : undefined })
  const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink'

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" data-testid="feedback-dialog">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)] md:rounded-3xl">
        <h2 id={`${id}-t`} className="text-lg font-bold text-ink">
          {t('feedback.title')}
        </h2>
        <p className="text-sm text-ink-2">{route}</p>
        <label htmlFor={`${id}-k`} className="text-sm font-medium text-ink-2">
          {t('feedback.what')}
        </label>
        <select id={`${id}-k`} ref={first} value={kind} onChange={(e) => setKind(e.target.value as IssueKind)} className={field} data-testid="feedback-kind">
          {ISSUE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`feedback.kind.${k}`)}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-d`} className="text-sm font-medium text-ink-2">
          {t('feedback.details')}
        </label>
        <textarea id={`${id}-d`} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} className={`${field} py-2`} data-testid="feedback-details" />
        {place && (
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={withPlace} onChange={(e) => setWithPlace(e.target.checked)} className="h-5 w-5" />
            {t('feedback.includePlace')}
          </label>
        )}
        <p className="text-xs text-muted">{t('feedback.note')}</p>
        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white" data-testid="feedback-open">
            {t('feedback.openGithub')} ↗
          </a>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-line-strong px-4 text-sm text-ink">
            {t('report.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
