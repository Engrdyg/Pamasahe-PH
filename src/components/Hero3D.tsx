import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { distanceFare, formatPesos } from '../engine'
import { useApp } from '../state'

/**
 * Home hero: a 3D jeepney turning on a turntable (three.js, loaded as its own
 * chunk after first paint so the main bundle stays small). Drag sideways to
 * spin it. Under prefers-reduced-motion it renders a still three-quarter view.
 * Without WebGL only the title and backdrop show.
 */
export function Hero3D() {
  const { t } = useTranslation()
  const stage = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = stage.current
    if (!host) return
    let disposed = false
    let dispose: (() => void) | undefined
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const start = () =>
      import('../hero3d/scene')
        .then(({ mountHeroScene }) => {
          if (disposed) return
          dispose = mountHeroScene(host, { reducedMotion, onReady: () => setReady(true) }).dispose
        })
        .catch(() => {
          /* no WebGL: keep the plain backdrop */
        })
    // Start after first paint so the 3D chunk never delays the fare screens.
    const timer = window.setTimeout(() => void start(), 150)
    return () => {
      disposed = true
      window.clearTimeout(timer)
      dispose?.()
    }
  }, [])

  const { modesById, discount } = useApp()
  const jeep = modesById['puj-traditional']
  const minFare = jeep && (jeep.method === 'ADD_ON' || jeep.method === 'PER_KM') ? distanceFare(jeep, 1) : null

  return (
    <div className="hero" data-testid="hero">
      <div className="hero-text">
        <p className="hero-kicker">{t('hero.kicker')}</p>
        <h2 className="hero-title">{t('hero.title')}</h2>
        <p className="hero-sub">{t('hero.sub')}</p>
        <a href="#/plan" className="hero-search" data-testid="plan-open">
          <span className="hero-field">
            <span className="hero-dot" style={{ background: '#0b3d91' }} aria-hidden="true" />
            {t('map.from')}
          </span>
          <span className="hero-field">
            <span className="hero-dot" style={{ background: '#ffc72c' }} aria-hidden="true" />
            {t('map.to')}
          </span>
          <span className="hero-cta">{t('hero.cta')} ›</span>
        </a>
        <button
          type="button"
          className="hero-link"
          onClick={() => document.getElementById('fares')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          {t('hero.faresLink')} ↓
        </button>
      </div>
      <div className="hero-right" aria-hidden="true">
        <div ref={stage} className={`hero-stage ${ready ? 'is-ready' : ''}`} data-testid="hero-stage" />
        {minFare && (
          <div className="hero-tag">
            <span className="hero-tag-lb">{t('hero.tag')}</span>
            <span className="hero-tag-num">{formatPesos(discount ? minFare.discounted : minFare.regular)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
