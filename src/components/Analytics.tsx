import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { useRoute } from '../lib/router'

/** Page path and route name for a hash route. Route-planner deep links carry
 *  coordinates ("#/plan/14.5,121.0/…"); those are never reported, only "/plan". */
export function analyticsPath(segments: string[]): { path: string; route: string } {
  if (segments[0] === 'plan') return { path: '/plan', route: '/plan' }
  const path = `/${segments.join('/')}`
  return { path, route: segments[0] === 'calc' && segments.length > 1 ? '/calc/[category]' : path }
}

/** Vercel Web Analytics for the hash router. The script only tracks
 *  `location.pathname`, which is always "/" here, so page views are reported
 *  by hand: "#/calc/jeepney" becomes path "/calc/jeepney" on route
 *  "/calc/[category]", and the dashboard breaks views down per screen and
 *  per mode. Exact locations never reach analytics. Rendered only in Vercel builds (see `__VERCEL__` in
 *  vite.config.ts), so local dev and the GitHub Pages site never load it. */
export function Analytics() {
  const { path, route } = analyticsPath(useRoute())
  // The default event URL includes the hash, so replace it with the safe path too.
  return <VercelAnalytics route={route} path={path} beforeSend={(e) => ({ ...e, url: `${e.url.split('#')[0].replace(/\/$/, '')}${path}` })} />
}
