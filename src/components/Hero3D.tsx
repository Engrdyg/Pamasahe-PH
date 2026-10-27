import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

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

  return (
    <div className="hero" data-testid="hero">
      <div className="hero-text">
        <p className="hero-title">{t('hero.title')}</p>
        <p className="hero-sub">{t('hero.sub')}</p>
      </div>
      <div ref={stage} className={`hero-stage ${ready ? 'is-ready' : ''}`} aria-hidden="true" data-testid="hero-stage" />
    </div>
  )
}
