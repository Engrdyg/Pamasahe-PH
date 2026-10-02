import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { distanceFare, formatPesos, type DistanceMode } from '../engine'
import { Card, DiscountToggle, NumberField } from '../components/ui'
import { localized } from '../lib/format'
import { useApp } from '../state'

export function Compare() {
  const { t } = useTranslation()
  const { modes, discount, lang } = useApp()
  const [km, setKm] = useState('10')
  const kmNum = Number(km)
  const distanceModes = modes.filter(
    (m): m is DistanceMode => (m.method === 'ADD_ON' || m.method === 'PER_KM') && m.status !== 'pending_data',
  )

  const rows =
    Number.isFinite(kmNum) && kmNum > 0
      ? distanceModes
          .map((m) => ({ mode: m, fare: distanceFare(m, kmNum) }))
          .sort((a, b) => (discount ? a.fare.discounted - b.fare.discounted : a.fare.regular - b.fare.regular))
      : []

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-6xl md:px-8 md:py-6">
      <p className="text-sm text-ink-2">{t('compare.intro')}</p>
      <div className="md:hidden">
        <DiscountToggle compact />
      </div>
      <Card>
        <NumberField label={t('input.distance')} value={km} onChange={setKm} min={1} max={100} step={1} slider unit={t('common.km')} />
      </Card>
      <ol className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3" data-testid="compare-list">
        {rows.map(({ mode, fare }) => {
          const primary = discount ? fare.discounted : fare.regular
          const secondary = discount ? fare.regular : fare.discounted
          return (
            <li key={mode.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{localized(mode.name, lang)}</p>
                {fare.beyondTable && <p className="text-xs text-amber-700 dark:text-amber-300">⚠ {t('compare.beyond')}</p>}
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums text-ink">{formatPesos(primary)}</p>
                <p className="text-xs tabular-nums text-muted">{formatPesos(secondary)}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
