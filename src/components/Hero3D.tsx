import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { distanceFare, formatPesos } from '../engine'
import { useApp } from '../state'
import { JeepStill } from './JeepStill'

/**
 * Home hero: title and the route search (children), with a jeepney beside
 * it. A static SVG jeep shows at once; a 3D jeepney on a turntable (three.js,
 * its own chunk, loaded after first paint) replaces it once rendered. Without
 * WebGL, or if the 3D chunk fails, the static jeep stays.
 */
export function Hero3D({ children }: { children?: ReactNode }) {
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
          /* no WebGL: keep the static jeep */
        })
    // Start after first paint so the 3D chunk never delays the fare and route tools.
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
        {children}
      </div>
      <div className={`hero-right ${ready ? 'is-ready' : ''}`} aria-hidden="true">
        <JeepStill />
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
