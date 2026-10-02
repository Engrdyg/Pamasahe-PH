import { useTranslation } from 'react-i18next'
import type { Category } from '../engine/types'
import { setPref } from '../lib/prefs'
import { InstallCard } from '../components/InstallCard'
import { ParallaxHero } from '../components/ParallaxHero'
import { DiscountToggle } from '../components/ui'

// One icon set in the same style for every category (public/icons/*.svg),
// so tiles look identical on every phone instead of mixing emoji fonts.
const categories: { id: Category; icon: string }[] = [
  { id: 'busway', icon: 'busway' },
  { id: 'rail', icon: 'train' },
  { id: 'jeepney', icon: 'jeepney' },
  { id: 'uv', icon: 'uv' },
  { id: 'bus-city', icon: 'bus-city' },
  { id: 'bus-provincial', icon: 'bus-provincial' },
  { id: 'taxi', icon: 'taxi' },
  { id: 'tnvs', icon: 'tnvs' },
]

export function Home() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 pb-4">
      <ParallaxHero />
      <div className="flex flex-col gap-4 px-4">
      <DiscountToggle />
      <ul className="grid auto-rows-fr grid-cols-2 gap-3">
        {categories.map((c) => (
          <li key={c.id}>
            <a
              href={`#/calc/${c.id}`}
              onClick={() => setPref('lastCategory', c.id)}
              className="flex h-full min-h-32 flex-col justify-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors hover:border-brand active:bg-brand/5"
              data-testid={`tile-${c.id}`}
            >
              <img src={`${import.meta.env.BASE_URL}icons/${c.icon}.svg`} alt="" width={44} height={44} className="h-11 w-11" />
              <span>
                <span className="block text-base font-semibold text-ink">{t(`category.${c.id}`)}</span>
                <span className="block text-xs text-muted">{t(`categoryHint.${c.id}`)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <InstallCard />
      </div>
    </main>
  )
}
