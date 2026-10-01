import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { useRoute } from '../lib/router'

/** Vercel Web Analytics for the hash router. The script only tracks
 *  `location.pathname`, which is always "/" here, so page views are reported
 *  by hand: "#/calc/jeepney" becomes path "/calc/jeepney" on route
 *  "/calc/[category]", and the dashboard breaks views down per screen and
 *  per mode. Rendered only in Vercel builds (see `__VERCEL__` in
 *  vite.config.ts), so local dev and the GitHub Pages site never load it. */
export function Analytics() {
  const segments = useRoute()
  const path = `/${segments.join('/')}`
  const route = segments[0] === 'calc' && segments.length > 1 ? '/calc/[category]' : path
  return <VercelAnalytics route={route} path={path} />
}
