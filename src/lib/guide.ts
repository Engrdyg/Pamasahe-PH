/** Hand-off of the selected itinerary from the planner to guided trip mode.
 *  Kept in sessionStorage so a reload during the trip keeps it. */
import type { SlimItinerary } from './planner'

export interface GuideTrip {
  itinerary: SlimItinerary
  /** Names of the ends and of each ride's boarding / alighting point. */
  fromLabel: string
  toLabel: string
  board: string[]
  alight: string[]
  /** Passenger label and fare total shown during the trip. */
  passenger: string
  colors: string[]
}

const KEY = 'pamasahe-ph:guide'

export function setGuide(g: GuideTrip): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(g))
  } catch {
    /* storage blocked: guided mode will say there is no trip */
  }
}

export function getGuide(): GuideTrip | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as GuideTrip | null
    return v?.itinerary ? v : null
  } catch {
    return null
  }
}
