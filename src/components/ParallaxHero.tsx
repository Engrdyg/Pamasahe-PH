import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Decorative hero for the Home screen: first-person view through a bus
 * windshield on EDSA. The road, lane markings and buildings approach the
 * viewer (CSS scale from the vanishing point), the sky lags on scroll, and
 * the scene shifts slightly when the phone is tilted. Pure SVG + CSS.
 * All motion is disabled under prefers-reduced-motion.
 */

// Buildings drawn at their "nearest" position; they animate from a dot at
// the vanishing point (400,120) up to this size. [x, width, height, delay, tone]
const LEFT_BUILDINGS: [number, number, number, number, number][] = [
  [150, 90, 150, 0, 0],
  [40, 110, 200, -2.4, 1],
  [200, 60, 110, -4.8, 2],
]
const RIGHT_BUILDINGS: [number, number, number, number, number][] = [
  [560, 90, 170, -1.2, 1],
  [650, 110, 130, -3.6, 2],
  [540, 60, 220, -6, 0],
]

function Building({ x, w, h, delay, tone }: { x: number; w: number; h: number; delay: number; tone: number }) {
  const base = 190
  const cols = Math.max(2, Math.floor(w / 26))
  const rows = Math.max(2, Math.floor(h / 30))
  return (
    <g className={`drive bldg bldg-${tone}`} style={{ animationDelay: `${delay}s`, ['--dur' as string]: '7s' }}>
      <rect x={x} y={base - h} width={w} height={h} />
      <g className="bldg-win">
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={x + 7 + (c * (w - 14)) / cols}
              y={base - h + 10 + r * 28}
              width="9"
              height="12"
              opacity={(r * 3 + c + tone) % 4 === 0 ? 0.25 : 0.85}
            />
          )),
        )}
      </g>
    </g>
  )
}

export function ParallaxHero() {
  const { t } = useTranslation()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const layers = Array.from(el.querySelectorAll<HTMLElement>('[data-depth]'))
    let scrollY = 0
    let tiltX = 0
    let raf = 0
    const apply = () => {
      raf = 0
      for (const l of layers) {
        const depth = Number(l.dataset.depth)
        // Far layers lag behind the page as it scrolls; the frame never moves.
        l.style.transform = `translate3d(${(tiltX * depth * 30).toFixed(1)}px, ${(scrollY * (0.8 - depth) * 0.5).toFixed(1)}px, 0)`
      }
      el.style.setProperty('--tilt', tiltX.toFixed(3))
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
      {/* Back layer: sky, sun/moon, stars, clouds, far skyline */}
      <svg className="hero-layer" data-depth="0.2" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="hero-sky-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="hero-sky-top" />
            <stop offset="1" className="hero-sky-bottom" />
          </linearGradient>
        </defs>
        <rect width="800" height="260" fill="url(#hero-sky-g)" />
        <g className="hero-stars">
          {[180, 230, 290, 350, 420, 470, 530, 590, 640, 260, 500, 560].map((x, i) => (
            <circle key={x} cx={x} cy={14 + ((i * 37) % 70)} r={i % 3 === 0 ? 1.8 : 1.2} />
          ))}
        </g>
        <circle className="hero-sun" cx="560" cy="62" r="22" />
        <g className="hero-clouds">
          <ellipse cx="250" cy="52" rx="46" ry="14" />
          <ellipse cx="282" cy="46" rx="32" ry="16" />
          <ellipse cx="620" cy="90" rx="40" ry="12" />
        </g>
        <g className="hero-far">
          {[
            [150, 96, 24], [180, 88, 18], [205, 100, 30], [242, 80, 20], [268, 92, 26], [300, 72, 16], [322, 86, 34],
            [362, 94, 22], [390, 78, 20], [416, 90, 28], [450, 70, 18], [474, 84, 30], [510, 92, 20], [536, 76, 24],
            [566, 88, 32], [604, 98, 22], [632, 82, 18], [656, 94, 28],
          ].map(([x, y, w]) => (
            <rect key={x} x={x} y={y} width={w} height={120 - y + 2} />
          ))}
        </g>
      </svg>

      {/* Scene layer: ground, road, markings and buildings approaching */}
      <svg className="hero-layer hero-scene" data-depth="0.6" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice">
        <rect className="hero-ground" x="0" y="120" width="800" height="140" />
        <polygon className="hero-road" points="392,120 408,120 760,260 40,260" />
        {/* Solid yellow line on the left (busway / median side) */}
        <polygon className="hero-lane" points="397,121 399,121 232,260 222,260" />
        {/* Dashed white line on the right, driving toward the viewer */}
        {[0, 1, 2, 3, 4].map((i) => (
          <polygon
            key={i}
            className="drive dash"
            style={{ animationDelay: `${(-i * 1.6) / 5}s`, ['--dur' as string]: '1.6s' }}
            points="548,222 556,221 604,258 594,260"
          />
        ))}
        {LEFT_BUILDINGS.map(([x, w, h, delay, tone]) => (
          <Building key={`l${x}`} x={x} w={w} h={h} delay={delay} tone={tone} />
        ))}
        {RIGHT_BUILDINGS.map(([x, w, h, delay, tone]) => (
          <Building key={`r${x}`} x={x} w={w} h={h} delay={delay} tone={tone} />
        ))}
      </svg>

      {/* Windshield frame (never moves) */}
      <div className="ws-glare" />
      <div className="ws-pillar ws-pillar-left" />
      <div className="ws-pillar ws-pillar-right" />
      <div className="ws-top" />
      <div className="ws-mirror">
        <div className="ws-mirror-glass" />
      </div>
      <div className="ws-charm">
        <span className="ws-charm-string" />
        <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" width={30} height={30} />
      </div>
      <div className="ws-dash">
        <span className="ws-vent" />
        <span className="ws-vent" />
      </div>

      <div className="hero-text">
        <p className="hero-title">{t('hero.title')}</p>
        <p className="hero-sub">{t('hero.sub')}</p>
      </div>
    </div>
  )
}
