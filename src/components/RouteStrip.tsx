import { useTranslation } from 'react-i18next'
import type { MatrixDirection } from '../engine/types'

/**
 * Numbered list of the stations in one direction, like the markers on the
 * station map. Highlights the boarding and alighting stations and the
 * stretch between them.
 */
export function RouteStrip({ direction, from, to }: { direction: MatrixDirection; from: string; to: string }) {
  const { t } = useTranslation()
  const a = direction.stations.indexOf(from)
  const b = direction.stations.indexOf(to)
  const [i, j] = a <= b ? [a, b] : [b, a]
  return (
    <ol className="route-strip" aria-label={t('busway.route')} data-testid="route-strip">
      {direction.stations.map((st, k) => {
        const info = direction.stationInfo?.[k]
        const active = k === i || k === j
        const between = k > i && k < j
        return (
          <li key={st} className={`route-stop ${active ? 'is-active' : ''} ${between ? 'is-between' : ''} ${k < i || k > j ? 'is-outside' : ''}`}>
            <span className="route-marker" aria-hidden="true">
              {k + 1}
            </span>
            <span className="route-name">
              {st}
              {active && (
                <span className="route-role">{k === a ? t('busway.boarding') : t('busway.alighting')}</span>
              )}
              {active && info?.note && <span className="route-note">{info.note}</span>}
              {active && info && (
                <a
                  className="route-map"
                  href={`https://www.google.com/maps/search/?api=1&query=${info.lat},${info.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('busway.map')} ↗
                </a>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
