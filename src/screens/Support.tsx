import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui'
import { openGcash } from '../lib/gcash'

export function Support() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-3xl md:px-8 md:py-6">
      <Card className="flex flex-col gap-4 border-accent/50 bg-accent/10" data-testid="donate-card">
        <p className="text-sm text-ink-2">{t('donate.body')}</p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <img
            src={`${import.meta.env.BASE_URL}gcash-qr.png`}
            alt="GCash QR"
            width={220}
            height={220}
            className="h-55 w-55 shrink-0 rounded-2xl bg-white p-2 shadow"
          />
          <div className="flex min-w-0 flex-col gap-3 text-sm">
            <p className="font-semibold text-ink">
              GCash · {t('donate.name')}
              <span className="block font-normal tabular-nums text-ink-2">{t('donate.mobile')}</span>
            </p>
            <p className="text-xs text-muted">{t('donate.scan')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openGcash}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0a6cff] px-5 text-sm font-semibold text-white"
                data-testid="open-gcash"
              >
                {t('donate.open')}
              </button>
              <a
                href={`${import.meta.env.BASE_URL}gcash-qr.png`}
                download="magkano-pamasahe-gcash-qr.png"
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-medium text-ink-2"
              >
                {t('donate.save')}
              </a>
            </div>
            <p className="text-xs text-muted">{t('donate.note')}</p>
          </div>
        </div>
      </Card>
    </main>
  )
}
