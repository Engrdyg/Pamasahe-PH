import { useTranslation } from 'react-i18next'
import { BottomNav, TopBar, navSection } from './components/Nav'
import { Sidebar } from './components/Sidebar'
import type { Category } from './engine/types'
import { formatEffective } from './lib/format'
import { useRoute } from './lib/router'
import { useWide } from './lib/useMediaQuery'
import { About } from './screens/About'
import { Calculator } from './screens/Calculator'
import { Compare } from './screens/Compare'
import { Fares } from './screens/Fares'
import { Guide } from './screens/Guide'
import { Home } from './screens/Home'
import { More } from './screens/More'
import { Plan } from './screens/Plan'
import { Privacy } from './screens/Privacy'
import { Support } from './screens/Support'
import { Trip } from './screens/Trip'
import { Tables } from './screens/Tables'
import { getDraft, planHref } from './lib/places'
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
  const route = useRoute()
  const [section, arg] = route
  const wide = useWide()

  let screen
  let title: string | undefined
  let back: string | undefined
  const isCalc = section === 'calc' && CATEGORIES.includes(arg as Category)
  const active = navSection(isCalc || section !== 'calc' ? section : undefined)
  if (isCalc) {
    screen = <Calculator key={arg} category={arg as Category} />
    title = t(`category.${arg}`)
    back = 'fares'
  } else if (section === 'fares') {
    screen = <Fares />
    title = t('fares.title')
  } else if (section === 'more') {
    screen = <More />
    title = t('nav.more')
  } else if (section === 'compare') {
    screen = <Compare />
    title = t('compare.title')
    back = 'more'
  } else if (section === 'tables') {
    screen = <Tables />
    title = t('tables.title')
    back = 'more'
  } else if (section === 'plan') {
    const [, fromArg, toArg] = route
    screen = <Plan key={`${fromArg}/${toArg}`} fromArg={fromArg} toArg={toArg} />
    title = t('plan.title')
  } else if (section === 'guide') {
    screen = <Guide />
    title = t('guide.title')
    back = planHref(getDraft().from, getDraft().to).slice(2)
  } else if (section === 'privacy') {
    screen = <Privacy />
    title = t('privacy.title')
    back = 'more'
  } else if (section === 'trip') {
    screen = <Trip />
    title = t('trip.title')
  } else if (section === 'support') {
    screen = <Support />
    title = t('donate.title')
    back = 'more'
  } else if (section === 'about') {
    screen = <About />
    title = t('about.title')
    back = 'more'
  } else {
    screen = <Home />
  }

  if (wide) {
    return (
      <div className="flex min-h-dvh bg-canvas text-ink">
        <Sidebar active={active} section={section ?? ''} />
        <div className="min-w-0 flex-1">
          <UpdateBanner />
          {title && (
            <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-8 pt-8">
              {back != null && (
                <a href={`#/${back}`} aria-label={t('common.back')} className="flex min-h-10 min-w-10 items-center justify-center rounded-full border border-line-strong text-xl text-brand">
                  ‹
                </a>
              )}
              <h1 className="text-2xl font-bold text-ink">{title}</h1>
            </div>
          )}
          {screen}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-canvas pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-ink">
      <TopBar title={title} back={back} />
      <UpdateBanner />
      {screen}
      <BottomNav active={active} />
    </div>
  )
}
