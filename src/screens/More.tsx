import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Chips, PassengerPicker } from '../components/ui'
import { clearPlaces, loadPlaces } from '../lib/places'
import type { Theme } from '../lib/theme'
import { useApp } from '../state'

const links = [
  { id: 'compare', key: 'nav.compare', icon: '⇄', hint: 'more.compareHint' },
  { id: 'tables', key: 'nav.tables', icon: '☰', hint: 'more.tablesHint' },
  { id: 'support', key: 'nav.support', icon: '♥', hint: 'more.supportHint' },
  { id: 'about', key: 'nav.about', icon: 'ⓘ', hint: 'more.aboutHint' },
  { id: 'privacy', key: 'privacy.link', icon: '🔒', hint: 'more.privacyHint' },
] as const

/** Secondary tools, settings and information. */
export function More() {
  const { t } = useTranslation()
  const { lang, setLang, theme, setTheme, trip, clearTrip } = useApp()
  const [places, setPlaces] = useState(() => loadPlaces())
  const [done, setDone] = useState<string | null>(null)
  const nPlaces = places.saved.length + places.recent.length

  const wipePlaces = () => {
    if (!window.confirm(t('more.confirmPlaces'))) return
    setPlaces(clearPlaces())
    setDone(t('more.placesCleared'))
  }
  const wipeTrip = () => {
    if (!window.confirm(t('more.confirmTrip'))) return
    clearTrip()
    setDone(t('more.tripCleared'))
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-3xl md:px-8 md:py-6" data-testid="more-screen">
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        {links.map((l) => (
          <li key={l.id} className="border-b border-line last:border-0">
            <a href={`#/${l.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2" data-testid={`more-${l.id}`}>
              <span aria-hidden="true" className="w-6 text-center text-lg text-brand">
                {l.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-ink">{t(l.key)}</span>
                <span className="block text-xs text-muted">{t(l.hint)}</span>
              </span>
              <span aria-hidden="true" className="text-xl text-muted">
                ›
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-ink">{t('more.settings')}</h2>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t('more.passenger')}</p>
          <PassengerPicker compact />
        </div>
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
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">{t('more.data')}</h2>
        <p className="text-xs text-muted">{t('more.dataNote')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={wipePlaces}
            disabled={nPlaces === 0}
            className="min-h-11 rounded-full border border-line-strong px-4 text-sm text-ink disabled:opacity-50"
            data-testid="more-clear-places"
          >
            {t('more.clearPlaces', { n: nPlaces })}
          </button>
          <button
            type="button"
            onClick={wipeTrip}
            disabled={trip.length === 0}
            className="min-h-11 rounded-full border border-line-strong px-4 text-sm text-ink disabled:opacity-50"
            data-testid="more-clear-trip"
          >
            {t('more.clearTrip', { n: trip.length })}
          </button>
        </div>
        {done && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            {done}
          </p>
        )}
      </Card>

      <a href="tel:1342" className="text-sm text-muted">
        {t('about.hotline')}: <span className="font-semibold text-ink">1342</span>
      </a>
    </main>
  )
}
