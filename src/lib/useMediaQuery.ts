import { useEffect, useState } from 'react'

/** True when the media query matches; false where matchMedia is unavailable (tests). */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

/** Tablet landscape and up: sidebar layout instead of the bottom tab bar. */
export const useWide = () => useMediaQuery('(min-width: 768px)')
