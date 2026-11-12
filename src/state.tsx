import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import i18n from './i18n'
import type { Lang, Manifest, Mode } from './engine/types'
import { getPref, setPref, type Passenger } from './lib/prefs'
import { applyTheme, watchSystemTheme, type Theme } from './lib/theme'
import { loadTrip, newLegId, saveTrip, type TripLeg } from './lib/trip'
import { checkForUpdate, loadFareData } from './lib/updater'

interface AppState {
  modes: Mode[]
  modesById: Record<string, Mode>
  manifest: Manifest
  /** true for every discounted passenger type */
  discount: boolean
  setDiscount: (v: boolean) => void
  passenger: Passenger
  setPassenger: (p: Passenger) => void
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  setTheme: (t: Theme) => void
  updated: Manifest | null
  dismissUpdate: () => void
  trip: TripLeg[]
  addLeg: (leg: Omit<TripLeg, 'id' | 'addedAt'>) => void
  removeLeg: (id: string) => void
  updateLeg: (id: string, patch: Partial<TripLeg>) => void
  clearTrip: () => void
  /** Put back legs, e.g. to undo a clear. */
  setTripLegs: (legs: TripLeg[]) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => loadFareData())
  // Older versions stored only an on/off discount switch.
  const [passenger, setPassengerState] = useState<Passenger>(() => getPref('passenger') ?? (getPref('discount') ? 'student' : 'regular'))
  const discount = passenger !== 'regular'
  const [lang, setLangState] = useState<Lang>(() => getPref('lang'))
  const [theme, setThemeState] = useState<Theme>(() => getPref('theme'))
  const [updated, setUpdated] = useState<Manifest | null>(null)
  const [trip, setTrip] = useState<TripLeg[]>(() => loadTrip())
  useEffect(() => saveTrip(trip), [trip])
  const removeLeg = useCallback((id: string) => setTrip((t) => t.filter((l) => l.id !== id)), [])
  const updateLeg = useCallback((id: string, patch: Partial<TripLeg>) => setTrip((t) => t.map((l) => (l.id === id ? { ...l, ...patch } : l))), [])
  const clearTrip = useCallback(() => setTrip([]), [])
  const setTripLegs = useCallback((legs: TripLeg[]) => setTrip(legs), [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  useEffect(() => watchSystemTheme(() => getPref('theme')), [])

  useEffect(() => {
    let cancelled = false
    void checkForUpdate().then((m) => {
      if (!m || cancelled) return
      setData(loadFareData())
      if (getPref('dismissedUpdate') !== m.version) setUpdated(m)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Each leg keeps a snapshot of the fare-data version and passenger type it was priced with.
  const version = data.manifest.version
  const addLeg = useCallback(
    (leg: Omit<TripLeg, 'id' | 'addedAt'>) =>
      setTrip((t) => [...t, { fareVersion: version, passenger, ...leg, id: newLegId(), addedAt: Date.now() }]),
    [version, passenger],
  )

  const setPassenger = useCallback((p: Passenger) => {
    setPassengerState(p)
    setPref('passenger', p)
    setPref('discount', p !== 'regular')
  }, [])
  const setDiscount = useCallback((v: boolean) => setPassenger(v ? 'student' : 'regular'), [setPassenger])
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    setPref('lang', l)
    void i18n.changeLanguage(l)
    document.documentElement.lang = l
  }, [])
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    setPref('theme', t)
  }, [])
  const dismissUpdate = useCallback(() => {
    if (updated) setPref('dismissedUpdate', updated.version)
    setUpdated(null)
  }, [updated])

  const value = useMemo<AppState>(
    () => ({
      modes: data.modes,
      modesById: Object.fromEntries(data.modes.map((m) => [m.id, m])),
      manifest: data.manifest,
      discount,
      setDiscount,
      passenger,
      setPassenger,
      lang,
      setLang,
      theme,
      setTheme,
      updated,
      dismissUpdate,
      trip,
      addLeg,
      removeLeg,
      updateLeg,
      clearTrip,
      setTripLegs,
    }),
    [data, discount, setDiscount, passenger, setPassenger, lang, setLang, theme, setTheme, updated, dismissUpdate, trip, addLeg, removeLeg, updateLeg, clearTrip, setTripLegs],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
