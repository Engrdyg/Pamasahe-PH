import { useTranslation } from 'react-i18next'
import { useApp } from '../state'
import { EffectiveBadge } from './ui'

/** Primary destinations, the same on phones (bottom bar) and wide screens (sidebar). */
export const NAV_ITEMS = [
  { id: '', key: 'nav.home', icon: '⌂' },
  { id: 'plan', key: 'nav.plan', icon: '⌖' },
  { id: 'fares', key: 'nav.fares', icon: '₱' },
  { id: 'trip', key: 'nav.trip', icon: '🧭' },
  { id: 'more', key: 'nav.more', icon: '⋯' },
] as const

/** Which primary destination a route belongs to. */
export function navSection(section: string | undefined): string {
  switch (section) {
    case 'plan':
    case 'trip':
    case 'fares':
      return section
    case 'calc':
      return 'fares'
    case 'more':
    case 'compare':
    case 'tables':
    case 'support':
    case 'about':
    case 'privacy':
      return 'more'
    default:
      return ''
  }
}

/** Leg count on the My Trip destination. */
export function TripBadge() {
  const { t } = useTranslation()
  const { trip } = useApp()
  if (!trip.length) return null
  return (
    <span
      className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-[#0b3d91]"
      aria-label={t('nav.tripBadge', { count: trip.length })}
      data-testid="trip-badge"
    >
      {trip.length}
    </span>
  )
}

export function TopBar({ title, back }: { title?: string; back?: string }) {
  const { t } = useTranslation()
  const { lang, setLang, theme, setTheme } = useApp()
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const themeIcon = theme === 'light' ? '☀' : theme === 'dark' ? '☾' : '◐'
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur">
      {back != null ? (
        <a href={`#/${back}`} aria-label={t('common.back')} className="flex min-h-11 min-w-11 items-center justify-center text-2xl text-brand">
          ‹
        </a>
      ) : (
        <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" width={36} height={36} className="h-9 w-9" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-ink">{title ?? t('app.name')}</h1>
        {!title && <EffectiveBadge />}
      </div>
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        aria-label={t('theme.toggle', { mode: t(`theme.${theme}`) })}
        title={t('theme.toggle', { mode: t(`theme.${theme}`) })}
        className="min-h-11 min-w-11 rounded-full border border-line-strong text-lg text-ink-2"
        data-testid="theme-toggle"
      >
        <span aria-hidden="true">{themeIcon}</span>
      </button>
      <button
        type="button"
        onClick={() => setLang(lang === 'en' ? 'fil' : 'en')}
        aria-label={t('about.language')}
        className="min-h-11 rounded-full border border-line-strong px-3 text-xs font-semibold uppercase text-ink-2"
      >
        {lang === 'en' ? 'FIL' : 'EN'}
      </button>
    </header>
  )
}

export function BottomNav({ active }: { active: string }) {
  const { t } = useTranslation()
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {NAV_ITEMS.map((it) => (
          <li key={it.id} className="flex-1">
            <a
              href={`#/${it.id}`}
              aria-current={active === it.id ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                active === it.id ? 'text-brand' : 'text-muted'
              }`}
              data-testid={`nav-${it.id || 'home'}`}
            >
              <span className="relative text-lg leading-none">
                <span aria-hidden="true" className={it.id === 'trip' ? 'grayscale' : ''}>{it.icon}</span>
                {it.id === 'trip' && <TripBadge />}
              </span>
              {t(it.key)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
