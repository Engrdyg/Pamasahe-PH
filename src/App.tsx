import { useTranslation } from 'react-i18next'
import { BottomNav, TopBar } from './components/Nav'
import type { Category } from './engine/types'
import { formatEffective } from './lib/format'
import { useRoute } from './lib/router'
import { About } from './screens/About'
import { Calculator } from './screens/Calculator'
import { Compare } from './screens/Compare'
import { Home } from './screens/Home'
import { Tables } from './screens/Tables'
import { useApp } from './state'

const CATEGORIES: Category[] = ['jeepney', 'uv', 'bus-city', 'bus-provincial', 'busway', 'rail', 'taxi', 'tnvs']

function UpdateBanner() {
  const { t } = useTranslation()
  const { updated, dismissUpdate, lang } = useApp()
  if (!updated) return null
  return (
    <div role="status" className="flex items-center justify-between gap-3 bg-accent px-4 py-2 text-sm text-ink">
      <span>{t('update.banner', { date: formatEffective(updated.effective, lang) })}</span>
      <button type="button" onClick={dismissUpdate} className="min-h-9 rounded-full px-3 font-medium underline">
        {t('update.dismiss')}
      </button>
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const [section, arg] = useRoute()

  let screen
  let title: string | undefined
  let back: string | undefined
  let active = ''
  if (section === 'calc' && CATEGORIES.includes(arg as Category)) {
    screen = <Calculator key={arg} category={arg as Category} />
    title = t(`category.${arg}`)
    back = ''
  } else if (section === 'compare') {
    screen = <Compare />
    title = t('compare.title')
    active = 'compare'
  } else if (section === 'tables') {
    screen = <Tables />
    title = t('tables.title')
    active = 'tables'
  } else if (section === 'about') {
    screen = <About />
    title = t('about.title')
    active = 'about'
  } else {
    screen = <Home />
  }

  return (
    <div className="min-h-dvh bg-canvas pb-20 text-ink">
      <TopBar title={title} back={back} />
      <UpdateBanner />
      {screen}
      <BottomNav active={active} />
    </div>
  )
}
