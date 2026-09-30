import { useTranslation } from 'react-i18next'
import type { Category } from '../engine/types'
import { setPref } from '../lib/prefs'
import { DiscountToggle } from '../components/ui'

const categories: { id: Category; emoji: string }[] = [
  { id: 'jeepney', emoji: '🚙' },
  { id: 'uv', emoji: '🚐' },
  { id: 'bus-city', emoji: '🚌' },
  { id: 'bus-provincial', emoji: '🚍' },
  { id: 'busway', emoji: '🛣️' },
  { id: 'taxi', emoji: '🚕' },
  { id: 'tnvs', emoji: '📱' },
]

export function Home() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
      <p className="text-sm text-slate-600">{t('app.tagline')}</p>
      <DiscountToggle />
      <ul className="grid grid-cols-2 gap-3">
        {categories.map((c) => (
          <li key={c.id}>
            <a
              href={`#/calc/${c.id}`}
              onClick={() => setPref('lastCategory', c.id)}
              className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand active:bg-brand/5"
              data-testid={`tile-${c.id}`}
            >
              <span aria-hidden="true" className="text-3xl">
                {c.emoji}
              </span>
              <span>
                <span className="block text-base font-semibold text-slate-900">{t(`category.${c.id}`)}</span>
                <span className="block text-xs text-slate-500">{t(`categoryHint.${c.id}`)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
