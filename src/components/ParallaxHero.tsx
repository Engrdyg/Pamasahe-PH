import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Decorative parallax header for the Home screen: Metro Manila skyline with
 * the EDSA Busway. Pure SVG + CSS transforms. Layers move at different rates
 * on scroll and on device tilt. Disabled when the user prefers reduced motion.
 */
export function ParallaxHero() {
  const { t } = useTranslation()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const layers = Array.from(el.querySelectorAll<HTMLElement>('[data-depth]'))
    let scrollY = 0
    let tiltX = 0
    let raf = 0
    const apply = () => {
      raf = 0
      for (const l of layers) {
        const depth = Number(l.dataset.depth)
        // Far layers lag behind the page (move down as it scrolls up); the road keeps pace.
        l.style.transform = `translate3d(${(tiltX * depth * 24).toFixed(1)}px, ${(scrollY * (0.8 - depth) * 0.5).toFixed(1)}px, 0)`
      }
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onScroll = () => {
      scrollY = Math.min(window.scrollY, 400)
      schedule()
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return
      // Smooth and clamp left/right tilt to -1..1
      const target = Math.max(-1, Math.min(1, e.gamma / 30))
      tiltX = tiltX + (target - tiltX) * 0.2
      schedule()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('deviceorientation', onTilt)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('deviceorientation', onTilt)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={root} className="hero" aria-hidden="true" data-testid="parallax-hero">
      {/* Layer 0: sky, sun/moon, stars */}
      <svg className="hero-layer hero-sky" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="hero-sky-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="hero-sky-top" />
            <stop offset="1" className="hero-sky-bottom" />
          </linearGradient>
        </defs>
        <rect width="800" height="260" fill="url(#hero-sky-g)" />
        <g className="hero-stars">
          {[60, 140, 230, 310, 420, 500, 590, 680, 750, 180, 360, 640].map((x, i) => (
            <circle key={x} cx={x} cy={20 + ((i * 37) % 80)} r={i % 3 === 0 ? 1.8 : 1.2} />
          ))}
        </g>
        <circle className="hero-sun" cx="640" cy="70" r="30" />
      </svg>

      {/* Layer 1: clouds (slowest) */}
      <svg className="hero-layer" data-depth="0.15" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice">
        <g className="hero-clouds">
          <ellipse cx="120" cy="60" rx="56" ry="18" />
          <ellipse cx="160" cy="52" rx="40" ry="20" />
          <ellipse cx="430" cy="40" rx="48" ry="15" />
          <ellipse cx="465" cy="34" rx="34" ry="17" />
          <ellipse cx="700" cy="110" rx="46" ry="14" />
        </g>
      </svg>

      {/* Layer 2: far skyline */}
      <svg className="hero-layer" data-depth="0.3" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice">
        <g className="hero-far">
          <rect x="0" y="150" width="40" height="110" />
          <rect x="48" y="120" width="30" height="140" />
          <rect x="90" y="140" width="50" height="120" />
          <rect x="150" y="100" width="26" height="160" />
          <rect x="185" y="130" width="44" height="130" />
          <rect x="240" y="90" width="34" height="170" />
          <rect x="283" y="125" width="60" height="135" />
          <rect x="352" y="110" width="28" height="150" />
          <rect x="390" y="80" width="40" height="180" />
          <rect x="438" y="128" width="52" height="132" />
          <rect x="500" y="100" width="30" height="160" />
          <rect x="540" y="135" width="46" height="125" />
          <rect x="595" y="95" width="36" height="165" />
          <rect x="640" y="120" width="56" height="140" />
          <rect x="705" y="105" width="30" height="155" />
          <rect x="745" y="140" width="55" height="120" />
          <polygon points="240,90 257,66 274,90" />
          <polygon points="390,80 410,50 430,80" />
          <rect x="408" y="36" width="4" height="16" />
        </g>
      </svg>

      {/* Layer 3: near buildings with windows */}
      <svg className="hero-layer" data-depth="0.5" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice">
        <g className="hero-near">
          <rect x="-10" y="165" width="90" height="100" />
          <rect x="110" y="150" width="70" height="115" />
          <rect x="230" y="175" width="110" height="90" />
          <rect x="400" y="155" width="60" height="110" />
          <rect x="520" y="170" width="95" height="95" />
          <rect x="670" y="150" width="80" height="115" />
          <rect x="760" y="180" width="60" height="85" />
        </g>
        <g className="hero-windows">
          {[
            [0, 175, 80, 3], [120, 160, 60, 3], [240, 185, 100, 4], [410, 165, 50, 2], [530, 180, 85, 3], [680, 160, 70, 3],
          ].flatMap(([x, y, w, cols], bi) =>
            Array.from({ length: 4 }, (_, r) =>
              Array.from({ length: cols }, (_, c) => (
                <rect
                  key={`${bi}-${r}-${c}`}
                  x={x + 8 + (c * (w - 16)) / cols}
                  y={y + 8 + r * 16}
                  width="8"
                  height="8"
                  opacity={(r + c + bi) % 3 === 0 ? 0.25 : 0.8}
                />
              )),
            ),
          )}
        </g>
      </svg>

      {/* Layer 4: road, busway lane and bus (fastest) */}
      <svg className="hero-layer" data-depth="0.8" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice">
        <rect className="hero-road" x="0" y="212" width="800" height="48" />
        <rect className="hero-lane" x="0" y="214" width="800" height="3" />
        <g className="hero-dash">
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={i * 60} y="236" width="30" height="3" />
          ))}
        </g>
        <g className="hero-bus">
          <rect x="0" y="0" width="118" height="40" rx="8" className="hero-bus-body" />
          <rect x="8" y="7" width="22" height="16" rx="2" className="hero-bus-glass" />
          <rect x="36" y="7" width="22" height="16" rx="2" className="hero-bus-glass" />
          <rect x="64" y="7" width="22" height="16" rx="2" className="hero-bus-glass" />
          <rect x="92" y="7" width="20" height="16" rx="2" className="hero-bus-glass" />
          <rect x="0" y="28" width="118" height="5" className="hero-bus-stripe" />
          <circle cx="26" cy="41" r="7" className="hero-bus-wheel" />
          <circle cx="92" cy="41" r="7" className="hero-bus-wheel" />
        </g>
      </svg>

      <div className="hero-text">
        <p className="hero-title">{t('hero.title')}</p>
        <p className="hero-sub">{t('hero.sub')}</p>
      </div>
    </div>
  )
}
