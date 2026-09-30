import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import i18n from './i18n'
import type { Lang, Manifest, Mode } from './engine/types'
import { getPref, setPref } from './lib/prefs'
import { checkForUpdate, loadFareData } from './lib/updater'

interface AppState {
  modes: Mode[]
  modesById: Record<string, Mode>
  manifest: Manifest
  discount: boolean
  setDiscount: (v: boolean) => void
  lang: Lang
  setLang: (l: Lang) => void
  updated: Manifest | null
  dismissUpdate: () => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => loadFareData())
  const [discount, setDiscountState] = useState(() => getPref('discount'))
  const [lang, setLangState] = useState<Lang>(() => getPref('lang'))
  const [updated, setUpdated] = useState<Manifest | null>(null)

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

  const setDiscount = useCallback((v: boolean) => {
    setDiscountState(v)
    setPref('discount', v)
  }, [])
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    setPref('lang', l)
    void i18n.changeLanguage(l)
    document.documentElement.lang = l
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
      lang,
      setLang,
      updated,
      dismissUpdate,
    }),
    [data, discount, setDiscount, lang, setLang, updated, dismissUpdate],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
