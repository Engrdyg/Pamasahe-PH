/**
 * External services in one place: map tiles, place search (Photon) and road
 * routing (OSRM). Endpoints can be changed at build time with VITE_TILE_URL,
 * VITE_PHOTON_URL, VITE_PHOTON_REVERSE_URL and VITE_OSRM_URL (e.g. to a
 * self-hosted or commercial provider) without touching the code that uses
 * them. Check each provider's usage policy before sending production traffic.
 */
const env = (import.meta.env ?? {}) as Record<string, string | undefined>

export const PROVIDERS = {
  tiles: {
    url: env.VITE_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  photonSearch: env.VITE_PHOTON_URL ?? 'https://photon.komoot.io/api/',
  photonReverse: env.VITE_PHOTON_REVERSE_URL ?? 'https://photon.komoot.io/reverse',
  osrm: env.VITE_OSRM_URL ?? 'https://router.project-osrm.org/route/v1/driving',
} as const

/** Request timeout for external services (ms). */
export const TIMEOUT_MS = 8000

/** fetch with a timeout; also honours an outer AbortSignal. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  fetchFn: typeof fetch = fetch,
  ms = TIMEOUT_MS,
): Promise<Response> {
  const ctl = new AbortController()
  const outer = init.signal
  const onAbort = () => ctl.abort()
  if (outer) {
    if (outer.aborted) ctl.abort()
    else outer.addEventListener('abort', onAbort, { once: true })
  }
  const timer = setTimeout(() => ctl.abort(), ms)
  try {
    return await fetchFn(url, { ...init, signal: ctl.signal })
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener('abort', onAbort)
  }
}
