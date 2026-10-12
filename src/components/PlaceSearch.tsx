import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchPlaces, type Place } from '../lib/geocode'
import { DEFAULT_CENTER, type LatLng } from '../lib/routing'

/** Text box with place suggestions (debounced). Selecting one reports a Place. */
export function PlaceSearch({
  label,
  value,
  onChange,
  onSelect,
  near,
  testId,
  trailing,
}: {
  label: string
  value: string
  onChange: (text: string) => void
  onSelect: (place: Place) => void
  near?: LatLng | null
  testId?: string
  trailing?: React.ReactNode
}) {
  const { t } = useTranslation()
  const id = useId()
  const [items, setItems] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(-1)
  const abort = useRef<AbortController | null>(null)
  const chosen = useRef<string | null>(null)

  useEffect(() => {
    if (chosen.current === value) return // just selected; don't re-search
    if (value.trim().length < 3) {
      setItems([])
      return
    }
    const timer = window.setTimeout(async () => {
      abort.current?.abort()
      const ctl = new AbortController()
      abort.current = ctl
      setBusy(true)
      try {
        const res = await searchPlaces(value, near ?? DEFAULT_CENTER, fetch, ctl.signal)
        if (!ctl.signal.aborted) {
          setItems(res)
          setOpen(true)
          setActive(-1)
        }
      } catch {
        if (!ctl.signal.aborted) setItems([])
      } finally {
        if (!ctl.signal.aborted) setBusy(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [value, near])

  const choose = (p: Place) => {
    const text = p.detail ? `${p.label}, ${p.detail}` : p.label
    chosen.current = text
    onChange(text)
    onSelect(p)
    setItems([])
    setOpen(false)
  }

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          value={value}
          placeholder={t('map.searchHint')}
          onChange={(e) => {
            chosen.current = null
            onChange(e.target.value)
          }}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !items.length) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, items.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && active >= 0) {
              e.preventDefault()
              choose(items[active])
            } else if (e.key === 'Escape') setOpen(false)
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          data-testid={testId}
          className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {trailing}
      </div>
      {busy && <span className="sr-only">{t('map.searching')}</span>}
      {open && items.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute top-full left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-xl border border-line bg-surface shadow-lg"
        >
          {items.map((p, i) => (
            <li
              key={`${p.lat},${p.lng}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-brand/10' : 'hover:bg-canvas-2'}`}
            >
              <span className="block font-medium text-ink">{p.label}</span>
              {p.detail && <span className="block text-xs text-muted">{p.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      {open && !busy && items.length === 0 && value.trim().length >= 3 && chosen.current !== value && (
        <p className="text-xs text-muted">{t('map.noResults')}</p>
      )}
    </div>
  )
}
