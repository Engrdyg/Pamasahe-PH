import { useTranslation } from 'react-i18next'
import { formatPesos } from '../engine'
import { tripTotals } from '../lib/trip'
import { useApp } from '../state'

/** Floating summary of the multi-leg trip; links to the trip screen. */
export function TripBar({ wide }: { wide: boolean }) {
  const { t } = useTranslation()
  const { trip, discount } = useApp()
  if (trip.length === 0) return null
  const totals = tripTotals(trip)
  const total = formatPesos(discount ? totals.discounted : totals.regular)
  return (
    <a
      href="#/trip"
      className={`fixed z-20 flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-[#0b3d91] shadow-lg ${
        wide ? 'bottom-6 right-6' : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2'
      }`}
      data-testid="trip-bar"
    >
      <span aria-hidden="true">🧭</span>
      {t(trip.length === 1 ? 'trip.bar_one' : 'trip.bar', { n: trip.length, total })} ›
    </a>
  )
}
