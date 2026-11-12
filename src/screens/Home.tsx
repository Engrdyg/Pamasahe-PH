import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FareTiles } from '../components/FareTiles'
import { Hero3D } from '../components/Hero3D'
import { InstallCard } from '../components/InstallCard'
import { PlaceSheet, type SheetPick } from '../components/PlaceSheet'
import { DiscountToggle } from '../components/ui'
import { getDraft, loadPlaces, planHref, setDraft, type PlanDraft, type SavedPlace } from '../lib/places'
import { stationPlaces } from '../lib/stationPlaces'
import { useWide } from '../lib/useMediaQuery'
import { useApp } from '../state'

type Field = 'from' | 'to'

/**
 * Home: where are you going (origin and destination, each with its own
 * picker), saved and recent places, then fare shortcuts by vehicle.
 */
export function Home() {
  const { t } = useTranslation()
  const wide = useWide()
  const { modesById } = useApp()
  const [draft, setDraftState] = useState<PlanDraft>(() => getDraft())
  const [sheet, setSheet] = useState<Field | null>(null)
  const [geoError, setGeoError] = useState(false)
  const [locating, setLocating] = useState<Field | null>(null)
  const [stored] = useState(() => loadPlaces())
  const shortcuts = [...stored.saved.map((p) => ({ p, saved: true })), ...stored.recent.map((p) => ({ p, saved: false }))]
    .filter((x, i, a) => a.findIndex((y) => y.p.label === x.p.label) === i)
    .slice(0, 4)

  const put = (f: Field, p: SavedPlace | null) => setDraftState(setDraft({ [f]: p }))
  // Ask for location only after the person chooses it; on refusal, search stays available.
  const locate = (f: Field) => {
    setGeoError(false)
    if (!navigator.geolocation) return setGeoError(true)
    setLocating(f)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(null)
        put(f, { label: t('map.myLocationLabel'), lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setLocating(null)
        setGeoError(true)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  const onPick = (f: Field, r: SheetPick) => {
    setSheet(null)
    if (r.kind === 'place') put(f, r.place)
    else if (r.kind === 'here') locate(f)
  }

  const field = (f: Field) => {
    const v = draft[f]
    const label = f === 'from' ? t('map.from') : t('map.to')
    return (
      <button
        type="button"
        onClick={() => setSheet(f)}
        className={`hero-field ${v ? 'has-value' : ''}`}
        aria-label={v ? `${label}: ${v.label}` : label}
        data-testid={`home-${f}`}
      >
        <span className="hero-dot" style={{ background: f === 'from' ? '#0b3d91' : '#ffc72c' }} aria-hidden="true" />
        <span className="hero-field-text">
          {v ? (
            <>
              <span className="hero-field-label">{f === 'from' ? t('plan.fromShort') : t('plan.toShort')}</span>
              {v.label}
              {v.detail && <span className="font-normal text-muted"> · {v.detail}</span>}
            </>
          ) : locating === f ? (
            t('home.locating')
          ) : (
            label
          )}
        </span>
      </button>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-4 md:max-w-6xl md:gap-6 md:px-8 md:py-8">
      <div className="md:overflow-hidden md:rounded-3xl md:shadow-lg">
        <Hero3D>
          <div className="hero-search" data-testid="home-search">
            {field('from')}
            {field('to')}
            <a href={planHref(draft.from, draft.to)} className="hero-cta" data-testid="plan-open">
              {t('hero.cta')} ›
            </a>
          </div>
          {geoError && (
            <p role="status" className="text-xs text-ink-2" data-testid="home-geo-error">
              {t('home.geoDenied')}
            </p>
          )}
          {shortcuts.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label={t('home.shortcuts')} data-testid="home-shortcuts">
              {shortcuts.map(({ p, saved }) => (
                <button
                  key={`${p.label}-${p.lat}`}
                  type="button"
                  onClick={() => put('to', p)}
                  className="inline-flex min-h-9 max-w-[12rem] items-center gap-1 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink"
                >
                  <span aria-hidden="true">{saved ? '★' : '🕘'}</span>
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </Hero3D>
      </div>
      <div className="flex flex-col gap-3 px-4 md:gap-5 md:px-0">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="fares" className="scroll-mt-20 text-lg font-bold text-ink md:text-xl">
            {t('hero.faresTitle')}
          </h2>
          <a href="#/fares" className="text-sm font-semibold text-brand" data-testid="home-all-fares">
            {t('home.allFares')} ›
          </a>
        </div>
        {!wide && <DiscountToggle />}
        <FareTiles compact />
        <InstallCard />
      </div>

      {sheet && (
        <PlaceSheet
          title={sheet === 'from' ? t('map.from') : t('map.to')}
          near={draft.from ?? draft.to}
          stations={stationPlaces(modesById, t('plan.station'))}
          allowPin={false}
          onPick={(r) => onPick(sheet, r)}
          onClose={() => setSheet(null)}
        />
      )}
    </main>
  )
}
