import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../state'
import { formatEffective } from '../lib/format'

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
              : 'border-slate-300 bg-white text-slate-800 hover:border-brand/60'
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
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
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
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-xl font-semibold tabular-nums text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {unit && <span className="shrink-0 text-slate-500">{unit}</span>}
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
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
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
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
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

export function DiscountToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const { discount, setDiscount } = useApp()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={discount}
      onClick={() => setDiscount(!discount)}
      className={`flex min-h-11 items-center gap-3 rounded-full border px-3 py-2 text-left text-sm font-medium transition-colors ${
        discount ? 'border-accent bg-accent/15 text-slate-900' : 'border-slate-300 bg-white text-slate-700'
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors ${discount ? 'bg-accent' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${discount ? 'translate-x-5.5' : 'translate-x-0.5'}`}
        />
      </span>
      <span>{compact ? t('discountToggleShort') : t('discountToggle')}</span>
    </button>
  )
}

export function EffectiveBadge() {
  const { t } = useTranslation()
  const { manifest, lang } = useApp()
  return (
    <a
      href="https://ltfrb.gov.ph"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
    >
      <span aria-hidden="true">●</span>
      {t('effective', { date: formatEffective(manifest.effective, lang) })}
    </a>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {children}
    </p>
  )
}
