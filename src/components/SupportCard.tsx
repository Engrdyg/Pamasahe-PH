import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from './ui'

// Fill these in before merging. The QR from GCash › Receive via QR goes in
// public/donate-qr.png (the one there now is a placeholder). Set KOFI_URL to
// '' to hide the Ko-fi button.
const GCASH_NUMBER = '09XX XXX XXXX'
const GCASH_NAME = 'JU** D.'
const KOFI_URL = 'https://ko-fi.com/'

/** "Support the app" card for the About screen: the GCash number with a copy
 *  button, the GCash QR with a save link (a phone cannot scan its own screen,
 *  but the GCash scanner can read an uploaded image), and an optional Ko-fi
 *  link for cards and PayPal. No scripts, so nothing to load or block. */
export function SupportCard() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const qr = `${import.meta.env.BASE_URL}donate-qr.png`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(GCASH_NUMBER.replace(/\s/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (insecure context or permission denied); the
      // number stays on screen and is selectable.
    }
  }

  const pill = 'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold'

  return (
    <Card className="flex flex-col gap-3 border-accent/60 bg-accent/10" data-testid="support-card">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7.5-4.6-9.6-9.2C1 8.3 3.2 4.5 6.9 4.5c2 0 3.5 1.1 4.3 2.4.8-1.3 2.3-2.4 4.3-2.4 3.7 0 5.9 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{t('support.title')}</h2>
          <p className="text-sm text-ink-2">{t('support.body')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <img
          src={qr}
          alt={t('support.qrAlt')}
          width={96}
          height={96}
          className="h-24 w-24 shrink-0 rounded-lg border border-line bg-white"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">GCash</p>
          <p className="text-xl font-bold tabular-nums text-ink select-all" data-testid="gcash-number">
            {GCASH_NUMBER}
          </p>
          <p className="text-sm text-ink-2">{GCASH_NAME}</p>
          <button
            type="button"
            onClick={copy}
            aria-live="polite"
            className={`${pill} mt-2 bg-brand text-white shadow hover:opacity-90`}
          >
            {copied ? t('support.copied') : t('support.copy')}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">{t('support.hint')}</p>

      <div className="flex flex-wrap gap-2">
        <a
          href={qr}
          download="gcash-qr-magkano-pamasahe.png"
          className={`${pill} border border-line-strong bg-surface text-ink`}
        >
          {t('support.saveQr')}
        </a>
        {KOFI_URL && (
          <a href={KOFI_URL} target="_blank" rel="noreferrer" className={`${pill} border border-line-strong bg-surface text-ink`}>
            {t('support.kofi')}
          </a>
        )}
      </div>
    </Card>
  )
}
