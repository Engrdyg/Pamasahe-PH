import { useTranslation } from 'react-i18next'
import type { Theme } from '../lib/theme'
import { useApp } from '../state'
import { Chips, DiscountToggle, EffectiveBadge } from './ui'

const items = [
  { id: '', key: 'nav.home', icon: '⌂' },
  { id: 'compare', key: 'nav.compare', icon: '⇄' },
  { id: 'tables', key: 'nav.tables', icon: '☰' },
  { id: 'about', key: 'nav.about', icon: 'ⓘ' },
] as const

/** Persistent left navigation for tablets and desktops. */
export function Sidebar({ active }: { active: string }) {
  const { t } = useTranslation()
  const { lang, setLang, theme, setTheme } = useApp()
  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface px-5 py-6" data-testid="sidebar">
      <a href="#/" className="flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" width={40} height={40} className="h-10 w-10" />
        <span className="min-w-0">
          <span className="block text-base font-bold leading-tight text-ink">{t('app.name')}</span>
        </span>
      </a>
      <EffectiveBadge />
      <nav aria-label="Main">
        <ul className="flex flex-col gap-1">
          {items.map((it) => (
            <li key={it.id}>
              <a
                href={`#/${it.id}`}
                aria-current={active === it.id ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                  active === it.id ? 'bg-brand/10 text-brand' : 'text-ink-2 hover:bg-canvas-2'
                }`}
              >
                <span aria-hidden="true" className="w-6 text-center text-lg leading-none">
                  {it.icon}
                </span>
                {t(it.key)}
              </a>
            </li>
          ))}
        </ul>
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
        <a href="tel:1342" className="text-xs text-muted">
          {t('about.hotline')}: <span className="font-semibold text-ink">1342</span>
        </a>
      </div>
    </aside>
  )
}
