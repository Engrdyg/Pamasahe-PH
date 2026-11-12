import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state'
import { formatEffective } from '../lib/format'
import { PASSENGERS, type Passenger } from '../lib/prefs'

export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={o.disabled}
          onClick={() => onChange(o.id)}
          className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
            value === o.id
              ? 'border-brand bg-brand text-white'
              : 'border-line-strong bg-surface text-ink hover:border-brand/60'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  slider = false,
  unit,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
  step?: number
  slider?: boolean
  unit?: string
  hint?: string
}) {
  const id = useId()
  const num = Number(value)
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-xl font-semibold tabular-nums text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {unit && <span className="shrink-0 text-muted">{unit}</span>}
      </div>
      {slider && max != null && (
        <input
          type="range"
          aria-label={`${label} slider`}
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(num) ? Math.min(Math.max(num, min), max) : min}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full accent-brand"
        />
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Passenger type: Regular, Student, Senior, PWD. Shown near fare results. */
export function PassengerPicker({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const { passenger, setPassenger } = useApp()
  return (
    <div className="flex flex-col gap-1" data-testid="passenger-picker">
      {!compact && <span className="text-xs font-medium uppercase tracking-wide text-muted">{t('passenger.title')}</span>}
      <Chips<Passenger>
        label={t('passenger.title')}
        options={PASSENGERS.map((p) => ({ id: p, label: t(`passenger.${p}`) }))}
        value={passenger}
        onChange={setPassenger}
      />
      {passenger !== 'regular' && <span className="text-xs text-muted">{t('passenger.note')}</span>}
    </div>
  )
}

export function EffectiveBadge() {
  const { t } = useTranslation()
  const { manifest, lang } = useApp()
  return (
    <a
      href={manifest.sourceUrl ?? 'https://ltfrb.gov.ph/fare-rates/'}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
    >
      <span aria-hidden="true">●</span>
      {t('effective', { date: formatEffective(manifest.effective, lang) })}
    </a>
  )
}

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${className}`} {...rest}>
      {children}
    </section>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      {children}
    </p>
  )
}
