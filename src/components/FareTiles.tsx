import { useTranslation } from 'react-i18next'
import type { Category } from '../engine/types'
import { setPref } from '../lib/prefs'
import { categoryBasis, categoryFrom } from '../lib/rates'
import { useApp } from '../state'

// One icon set in the same style for every category (public/icons/*.svg),
// so tiles look identical on every phone instead of mixing emoji fonts.
export const CATEGORY_TILES: { id: Category; icon: string }[] = [
  { id: 'jeepney', icon: 'jeepney' },
  { id: 'rail', icon: 'train' },
  { id: 'busway', icon: 'busway' },
  { id: 'uv', icon: 'uv' },
  { id: 'bus-city', icon: 'bus-city' },
  { id: 'bus-provincial', icon: 'bus-provincial' },
  { id: 'taxi', icon: 'taxi' },
  { id: 'tnvs', icon: 'tnvs' },
]

/** Vehicle tiles: icon, name, what the amount means (basis) and the amount. */
export function FareTiles({ only, compact = false }: { only?: Category[]; compact?: boolean }) {
  const { t } = useTranslation()
  const { modes, discount } = useApp()
  const list = only ? CATEGORY_TILES.filter((c) => only.includes(c.id)) : CATEGORY_TILES
  return (
    <ul className={`grid auto-rows-fr grid-cols-2 gap-3 md:gap-4 ${compact ? 'md:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-4'}`}>
      {list.map((c) => {
        const from = categoryFrom(c.id, modes, discount, t)
        const basis = categoryBasis(c.id, modes)
        return (
          <li key={c.id}>
            <a
              href={`#/calc/${c.id}`}
              onClick={() => setPref('lastCategory', c.id)}
              className={`flex h-full flex-col justify-start gap-2 rounded-2xl border border-line bg-surface shadow-sm transition-colors hover:border-brand active:bg-brand/5 ${compact ? 'min-h-24 p-3' : 'min-h-32 gap-3 p-4'}`}
              data-testid={`tile-${c.id}`}
            >
              <img
                src={`${import.meta.env.BASE_URL}icons/${c.icon}.svg`}
                alt=""
                width={44}
                height={44}
                className={compact ? 'h-8 w-8' : 'h-11 w-11'}
              />
              <span>
                <span className="block text-base font-semibold text-ink">{t(`category.${c.id}`)}</span>
                {!compact && <span className="block text-xs text-muted">{t(`categoryHint.${c.id}`)}</span>}
                {basis && (
                  <span className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-muted" data-testid={`tile-basis-${c.id}`}>
                    {t(`rate.basis.${basis}`)}
                  </span>
                )}
                {from && (
                  <span className="block text-sm font-bold text-brand" data-testid={`tile-rate-${c.id}`}>
                    {from}
                  </span>
                )}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
