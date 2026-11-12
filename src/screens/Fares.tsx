import { useTranslation } from 'react-i18next'
import { FareTiles } from '../components/FareTiles'
import { PassengerPicker } from '../components/ui'
import { useWide } from '../lib/useMediaQuery'

/** Fares hub: pick a vehicle to open its calculator. */
export function Fares() {
  const { t } = useTranslation()
  const wide = useWide()
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-6xl md:px-8 md:py-6" data-testid="fares-screen">
      <p className="text-sm text-ink-2">{t('fares.intro')}</p>
      {!wide && <PassengerPicker />}
      <FareTiles />
      <p className="text-xs text-muted">{t('fares.basisNote')}</p>
      <div className="flex flex-wrap gap-2">
        <a href="#/tables" className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink">
          ☰ {t('nav.tables')}
        </a>
        <a href="#/compare" className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink">
          ⇄ {t('nav.compare')}
        </a>
      </div>
    </main>
  )
}
