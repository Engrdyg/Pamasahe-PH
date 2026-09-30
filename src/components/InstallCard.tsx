import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInstall } from '../lib/install'
import { getPref, setPref } from '../lib/prefs'
import { Card } from './ui'

/** "Download app" card: real install prompt where the browser offers one,
 *  platform instructions otherwise. Hidden once installed or dismissed. */
export function InstallCard({ dismissible = true }: { dismissible?: boolean }) {
  const { t } = useTranslation()
  const { state, install } = useInstall()
  const [hidden, setHidden] = useState(() => dismissible && getPref('installDismissed'))
  const [showHelp, setShowHelp] = useState(false)

  if (state === 'installed' || hidden) return null

  const onClick = async () => {
    if (state === 'prompt') await install()
    else setShowHelp(true)
  }
  const dismiss = () => {
    setPref('installDismissed', true)
    setHidden(true)
  }

  return (
    <Card className="flex flex-col gap-3 border-brand/30 bg-brand/5" data-testid="install-card">
      <div className="flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl shadow" />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{t('install.title')}</h2>
          <p className="text-sm text-ink-2">{t('install.body')}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow hover:opacity-90"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          {t('install.button')}
        </button>
        {dismissible && (
          <button type="button" onClick={dismiss} className="min-h-11 px-3 text-sm text-muted underline">
            {t('install.later')}
          </button>
        )}
      </div>
      {showHelp && (
        <p role="status" className="rounded-lg bg-canvas-2 px-3 py-2 text-sm text-ink-2">
          {t(state === 'ios' ? 'install.ios' : 'install.manual')}
        </p>
      )}
    </Card>
  )
}
