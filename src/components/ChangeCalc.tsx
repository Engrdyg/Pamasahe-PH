import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPesos, type Centavos } from '../engine'
import { parseAmount } from '../lib/report'

/** Optional change calculator: cash handed over minus the fare. */
export function ChangeCalc({ fare, estimated }: { fare: Centavos; estimated: boolean }) {
  const { t } = useTranslation()
  const id = useId()
  const [cash, setCash] = useState('')
  const paid = parseAmount(cash)
  const diff = Number.isFinite(paid) ? paid - fare : null
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-canvas p-3" data-testid="change-calc">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-muted">
        {t('change.cash')}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          placeholder="₱"
          className="min-h-11 w-32 rounded-xl border border-line-strong bg-surface px-3 text-lg font-semibold tabular-nums text-ink"
          data-testid="change-cash"
        />
        {[20, 50, 100].map((v) => (
          <button key={v} type="button" onClick={() => setCash(String(v))} className="min-h-10 rounded-full border border-line-strong px-3 text-sm tabular-nums text-ink">
            ₱{v}
          </button>
        ))}
      </div>
      {diff != null && (
        <p role="status" className="text-base font-bold tabular-nums text-ink" data-testid="change-result">
          {diff >= 0 ? t('change.change', { amount: formatPesos(diff) }) : t('change.short', { amount: formatPesos(-diff) })}
        </p>
      )}
      {estimated && <p className="text-[11px] text-muted">{t('change.estimated')}</p>}
    </div>
  )
}
