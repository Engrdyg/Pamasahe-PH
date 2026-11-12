import { useTranslation } from 'react-i18next'
import type { Theme } from '../lib/theme'
import { useApp } from '../state'
import { NAV_ITEMS, TripBadge } from './Nav'
import { Chips, DiscountToggle, EffectiveBadge } from './ui'

const secondary = [
  { id: 'compare', key: 'nav.compare', icon: '⇄' },
  { id: 'tables', key: 'nav.tables', icon: '☰' },
  { id: 'support', key: 'nav.support', icon: '♥' },
  { id: 'about', key: 'nav.about', icon: 'ⓘ' },
] as const

/** Persistent left navigation for tablets and desktops. */
export function Sidebar({ active, section }: { active: string; section: string }) {
  const { t } = useTranslation()
  const { lang, setLang, theme, setTheme } = useApp()
  const link = (id: string, label: string, icon: string, on: boolean) => (
    <li key={id}>
      <a
        href={`#/${id}`}
        aria-current={on ? 'page' : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${on ? 'bg-brand/10 text-brand' : 'text-ink-2 hover:bg-canvas-2'}`}
      >
        <span className="relative w-6 text-center text-lg leading-none">
          <span aria-hidden="true">{icon}</span>
          {id === 'trip' && <TripBadge />}
        </span>
        {label}
      </a>
    </li>
  )
  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-surface px-5 py-6" data-testid="sidebar">
      <a href="#/" className="flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" width={40} height={40} className="h-10 w-10" />
        <span className="min-w-0">
          <span className="block text-base font-bold leading-tight text-ink">{t('app.name')}</span>
        </span>
      </a>
      <EffectiveBadge />
      <nav aria-label="Main" className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.filter((it) => it.id !== 'more').map((it) => link(it.id, t(it.key), it.icon, active === it.id))}
        </ul>
        <div>
          <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-muted">{t('nav.more')}</p>
          <ul className="flex flex-col gap-1">{secondary.map((it) => link(it.id, t(it.key), it.icon, section === it.id))}</ul>
        </div>
      </nav>
      <DiscountToggle compact />
      <div className="mt-auto flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t('theme.title')}</p>
          <Chips<Theme>
            label={t('theme.title')}
            options={[
              { id: 'light', label: t('theme.light') },
              { id: 'dark', label: t('theme.dark') },
              { id: 'system', label: t('theme.system') },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t('about.language')}</p>
          <Chips
            label={t('about.language')}
            options={[
              { id: 'en', label: 'English' },
              { id: 'fil', label: 'Filipino' },
            ]}
            value={lang}
            onChange={setLang}
          />
        </div>
        <a href="#/privacy" className="text-xs text-muted underline">
          {t('privacy.link')}
        </a>
        <a href="tel:1342" className="text-xs text-muted">
          {t('about.hotline')}: <span className="font-semibold text-ink">1342</span>
        </a>
      </div>
    </aside>
  )
}
