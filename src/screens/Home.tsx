import { useTranslation } from 'react-i18next'
import type { Category } from '../engine/types'
import { setPref } from '../lib/prefs'
import { useWide } from '../lib/useMediaQuery'
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
  const wide = useWide()
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-4 md:max-w-6xl md:gap-6 md:px-8 md:py-8">
      <div className="md:overflow-hidden md:rounded-3xl md:shadow-lg">
        <ParallaxHero />
      </div>
      <div className="flex flex-col gap-4 px-4 md:gap-6 md:px-0">
      {!wide && <DiscountToggle />}
      <ul className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
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
