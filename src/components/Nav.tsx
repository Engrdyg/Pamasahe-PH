import { useTranslation } from 'react-i18next'
import { useApp } from '../state'
import { EffectiveBadge } from './ui'

const items = [
  { id: '', key: 'nav.home', icon: '⌂' },
  { id: 'compare', key: 'nav.compare', icon: '⇄' },
  { id: 'tables', key: 'nav.tables', icon: '☰' },
  { id: 'about', key: 'nav.about', icon: 'ⓘ' },
] as const

export function TopBar({ title, back }: { title?: string; back?: string }) {
  const { t } = useTranslation()
  const { lang, setLang } = useApp()
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
      {back != null ? (
        <a href={`#/${back}`} aria-label={t('common.back')} className="flex min-h-11 min-w-11 items-center justify-center text-2xl text-brand">
          ‹
        </a>
      ) : (
        <span aria-hidden="true" className="text-2xl">🚌</span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-slate-900">{title ?? t('app.name')}</h1>
        {!title && <EffectiveBadge />}
      </div>
      <button
        type="button"
        onClick={() => setLang(lang === 'en' ? 'fil' : 'en')}
        aria-label={t('about.language')}
        className="min-h-11 rounded-full border border-slate-300 px-3 text-xs font-semibold uppercase text-slate-700"
      >
        {lang === 'en' ? 'FIL' : 'EN'}
      </button>
    </header>
  )
}

export function BottomNav({ active }: { active: string }) {
  const { t } = useTranslation()
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {items.map((it) => (
          <li key={it.id} className="flex-1">
            <a
              href={`#/${it.id}`}
              aria-current={active === it.id ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                active === it.id ? 'text-brand' : 'text-slate-500'
              }`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {it.icon}
              </span>
              {t(it.key)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
