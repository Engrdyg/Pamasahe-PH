/** GPS ride tracking: accumulate distance from a stream of positions while
 *  rejecting the noise phones produce when standing still or indoors. */

export interface RidePoint {
  lat: number
  lng: number
  /** epoch ms */
  t: number
  /** reported accuracy in metres */
  acc: number
}

export interface RideState {
  startedAt: number
  endedAt?: number
  /** accepted points only */
  points: RidePoint[]
  /** metres over accepted points */
  meters: number
}

const EARTH_M = 6371008.8
const toRad = (d: number) => (d * Math.PI) / 180

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.sqrt(s))
}

export const MAX_ACCURACY_M = 60
export const MAX_SPEED_KMH = 150

/** Decide whether a new fix should extend the track. Returns the metres to add (0 = rejected). */
export function stepMeters(prev: RidePoint | undefined, next: RidePoint): number {
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return 0
  if (next.acc > MAX_ACCURACY_M) return 0
  if (!prev) return 0
  const d = haversineMeters(prev, next)
  // Ignore jitter smaller than the position uncertainty.
  if (d < Math.max(8, Math.min(next.acc, prev.acc))) return 0
  const dt = (next.t - prev.t) / 1000
  if (dt <= 0) return 0
  if ((d / dt) * 3.6 > MAX_SPEED_KMH) return 0
  return d
}

export function startRide(now = Date.now()): RideState {
  return { startedAt: now, points: [], meters: 0 }
}

/** Returns a new state (immutable update) with the fix accepted or ignored. */
export function addFix(state: RideState, fix: RidePoint): RideState {
  const prev = state.points[state.points.length - 1]
  if (!prev) {
    // First fix: accept only once accuracy is reasonable.
    return fix.acc <= MAX_ACCURACY_M ? { ...state, points: [fix] } : state
  }
  const d = stepMeters(prev, fix)
  if (d === 0) return state
  return { ...state, points: [...state.points, fix], meters: state.meters + d }
}

export function rideKm(state: RideState): number {
  return Math.round(state.meters / 100) / 10
}

export function rideMinutes(state: RideState, now = Date.now()): number {
  return Math.max(0, ((state.endedAt ?? now) - state.startedAt) / 60000)
}

export const RIDE_KEY = 'pamasahe-ph:ride'

export function saveRide(state: RideState | null): void {
  try {
    if (state) localStorage.setItem(RIDE_KEY, JSON.stringify(state))
    else localStorage.removeItem(RIDE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function loadRide(): RideState | null {
  try {
    const raw = localStorage.getItem(RIDE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as RideState
    return Number.isFinite(s.startedAt) && Array.isArray(s.points) ? s : null
  } catch {
    return null
  }
}
