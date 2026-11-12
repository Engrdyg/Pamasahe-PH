/**
 * Route-issue feedback. Destination: the project's public GitHub Issues,
 * opened in the browser with the text prefilled; nothing is sent unless the
 * person submits it there. Reports are user feedback, reviewed by the
 * maintainers before any route data changes; they never update the app's
 * route instructions automatically.
 */
export const ISSUES_URL = 'https://github.com/Engrdyg/Pamasahe-PH/issues/new'

export type IssueKind = 'boarding' | 'landmark' | 'geometry' | 'service' | 'other'
export const ISSUE_KINDS: IssueKind[] = ['boarding', 'landmark', 'geometry', 'service', 'other']

export interface IssueInput {
  kind: IssueKind
  kindLabel: string
  route: string
  mc?: string
  details: string
  /** Only when the person chose to include it: rounded to ~100 m. */
  place?: { lat: number; lng: number }
}

export function issueUrl(i: IssueInput): string {
  const lines = [
    `**Issue:** ${i.kindLabel}`,
    `**Route:** ${i.route}${i.mc ? ` (${i.mc})` : ''}`,
    i.place ? `**Approximate place:** ${i.place.lat.toFixed(3)}, ${i.place.lng.toFixed(3)}` : null,
    '',
    i.details.trim() || '(no details)',
    '',
    '_Sent from Bayad Po route feedback. User reports are reviewed before route data changes._',
  ].filter((x) => x != null)
  const q = new URLSearchParams({ title: `[Route feedback] ${i.kindLabel}: ${i.route}`.slice(0, 120), body: lines.join('\n'), labels: 'route-feedback' })
  return `${ISSUES_URL}?${q}`
}
