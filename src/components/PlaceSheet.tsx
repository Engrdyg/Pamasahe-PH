import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchPlaces } from '../lib/geocode'
import { addRecent, isSaved, loadPlaces, toggleSaved, type SavedPlace } from '../lib/places'
import { DEFAULT_CENTER, type LatLng } from '../lib/routing'

type Tab = 'suggestions' | 'saved' | 'recent'

// Text typed per field, restored if the sheet is closed without a pick (memory only).
const lastQuery = new Map<string, string>()

export type SheetPick = { kind: 'place'; place: SavedPlace } | { kind: 'here' } | { kind: 'pin' }

/**
 * Full-screen place picker for the route planner: search box, tabs for
 * suggestions / saved / recent, plus "current location" and "pin on map".
 * Suggestions while typing come from Photon and from rail / Busway station
 * names (offline).
 */
export function PlaceSheet({
  title,
  near,
  stations,
  onPick,
  onClose,
  allowPin = true,
}: {
  allowPin?: boolean
  title: string
  near: LatLng | null
  stations: SavedPlace[]
  onPick: (p: SheetPick) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [q, setQState] = useState(() => lastQuery.get(title) ?? '')
  const setQ = (v: string) => {
    lastQuery.set(title, v)
    setQState(v)
  }
  const pick = (p: SheetPick) => {
    lastQuery.delete(title)
    onPick(p)
  }
  const [tab, setTab] = useState<Tab>('suggestions')
  const [results, setResults] = useState<SavedPlace[]>([])
  const [busy, setBusy] = useState(false)
  // Place search (Photon) failed: keep the typed text and offer a retry.
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [stored, setStored] = useState(() => loadPlaces())
  const input = useRef<HTMLInputElement>(null)

  // Focus the search box; give focus back to whatever opened the sheet on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    input.current?.focus()
    input.current?.select()
    return () => opener?.focus?.()
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const query = q.trim()
    setFailed(false)
    if (query.length < 3) {
      setResults([])
      return
    }
    const ctl = new AbortController()
    const timer = window.setTimeout(async () => {
      setBusy(true)
      try {
        const res = await searchPlaces(query, near ?? DEFAULT_CENTER, fetch, ctl.signal)
        if (!ctl.signal.aborted) setResults(res)
      } catch {
        if (!ctl.signal.aborted) {
          setResults([])
          setFailed(true)
        }
      } finally {
        if (!ctl.signal.aborted) setBusy(false)
      }
    }, 300)
    return () => {
      ctl.abort()
      window.clearTimeout(timer)
    }
  }, [q, near, attempt])

  const query = q.trim().toLowerCase()
  const stationHits = query.length >= 2 ? stations.filter((s) => s.label.toLowerCase().includes(query)).slice(0, 5) : []

  const choose = (p: SavedPlace) => {
    setStored(addRecent(p))
    pick({ kind: 'place', place: p })
  }

  const row = (p: SavedPlace, key: string, icon = '📍') => (
    <li key={key} className="flex items-center gap-2 border-b border-line">
      <button type="button" onClick={() => choose(p)} className="flex min-h-14 flex-1 items-center gap-3 py-2 text-left" data-testid="sheet-place">
        <span aria-hidden="true" className="text-lg">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base text-ink">{p.label}</span>
          {p.detail && <span className="block truncate text-xs text-muted">{p.detail}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setStored(toggleSaved(p))}
        aria-label={isSaved(stored, p) ? t('plan.unsave') : t('plan.save')}
        aria-pressed={isSaved(stored, p)}
        className="flex min-h-11 min-w-11 items-center justify-center text-xl text-accent"
      >
        {isSaved(stored, p) ? '★' : '☆'}
      </button>
    </li>
  )

  const tabs: { id: Tab; label: string }[] = [
    { id: 'suggestions', label: t('plan.tabSuggestions') },
    { id: 'saved', label: t('plan.tabSaved') },
    { id: 'recent', label: t('plan.tabRecent') },
  ]

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[1000] flex flex-col bg-surface" data-testid="place-sheet">
      <div className="flex items-center gap-2 px-2 pt-[max(env(safe-area-inset-top),8px)]">
        <button type="button" onClick={onClose} aria-label={t('common.back')} className="flex min-h-12 min-w-12 items-center justify-center text-2xl text-ink-2">
          ‹
        </button>
        <h2 className="text-lg font-medium text-ink">{title}</h2>
      </div>
      <div className="px-4 pt-2">
        <div className="flex min-h-12 items-center gap-2 rounded-2xl bg-canvas-2 px-4">
          <span aria-hidden="true" className="text-muted">
            🔍
          </span>
          <input
            ref={input}
            type="text"
            inputMode="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setTab('suggestions')
            }}
            placeholder={t('plan.searchPlace')}
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-12 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
            data-testid="sheet-input"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label={t('plan.clear')} className="flex min-h-10 min-w-10 items-center justify-center text-xl text-muted">
              ✕
            </button>
          )}
        </div>
      </div>
      <div role="tablist" className="mt-3 grid grid-cols-3 border-b border-line">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`min-h-12 border-b-2 text-sm font-medium ${tab === x.id ? 'border-green-600 text-ink' : 'border-transparent text-muted'}`}
            data-testid={`sheet-tab-${x.id}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <ul className="flex-1 overflow-y-auto px-4">
        {tab === 'suggestions' && (
          <>
            {query.length < 3 && (
              <>
                <li className="border-b border-line">
                  <button type="button" onClick={() => pick({ kind: 'here' })} className="flex min-h-16 w-full items-center gap-4 py-2 text-left" data-testid="sheet-here">
                    <span aria-hidden="true" className="text-2xl text-green-600">
                      ◎
                    </span>
                    <span>
                      <span className="block text-xs text-muted">{t('plan.here')}</span>
                      <span className="block text-base text-ink">{t('plan.hereHint')}</span>
                    </span>
                  </button>
                </li>
                {allowPin && <li className="border-b border-line">
                  <button type="button" onClick={() => pick({ kind: 'pin' })} className="flex min-h-16 w-full items-center gap-4 py-2 text-left" data-testid="sheet-pin">
                    <span aria-hidden="true" className="text-2xl">
                      📌
                    </span>
                    <span className="flex-1 text-base text-ink">{t('plan.pin')}</span>
                    <span aria-hidden="true" className="text-xl text-green-600">
                      ›
                    </span>
                  </button>
                </li>}
              </>
            )}
            {stationHits.map((p) => row(p, `s-${p.label}`, '🚉'))}
            {results.map((p) => row(p, `r-${p.lat},${p.lng}`))}
            {busy && <li className="py-4 text-sm text-muted">{t('map.searching')}</li>}
            {!busy && failed && (
              <li className="flex flex-col items-start gap-2 py-4 text-sm text-ink-2" role="status" data-testid="sheet-failed">
                {t(navigator.onLine === false ? 'plan.searchOffline' : 'plan.searchFailed')}
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-11 rounded-full border border-line-strong px-4 font-medium text-ink" data-testid="sheet-retry">
                  {t('plan.retry')}
                </button>
              </li>
            )}
            {!busy && !failed && query.length >= 3 && results.length === 0 && stationHits.length === 0 && <li className="py-4 text-sm text-muted">{t('map.noResults')}</li>}
          </>
        )}
        {tab === 'saved' && (stored.saved.length ? stored.saved.map((p, i) => row(p, `v-${i}`, '★')) : <li className="py-6 text-sm text-muted">{t('plan.noSaved')}</li>)}
        {tab === 'recent' && (stored.recent.length ? stored.recent.map((p, i) => row(p, `h-${i}`, '🕘')) : <li className="py-6 text-sm text-muted">{t('plan.noRecent')}</li>)}
      </ul>
    </div>
  )
}
