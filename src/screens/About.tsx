import { useTranslation } from 'react-i18next'
import { InstallCard } from '../components/InstallCard'
import { Card, Chips } from '../components/ui'
import { openGcash } from '../lib/gcash'
import type { Theme } from '../lib/theme'
import { formatEffective } from '../lib/format'
import { useApp } from '../state'

export function About() {
  const { t } = useTranslation()
  const { manifest, lang, setLang, theme, setTheme } = useApp()
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:grid md:max-w-6xl md:grid-cols-2 md:items-start md:gap-6 md:px-8 md:py-6">
      <Card className="flex flex-col gap-3 border-brand/30 bg-brand/5">
        <h2 className="text-base font-bold text-ink">{t('about.report')}</h2>
        <a
          href="tel:1342"
          className="flex min-h-14 items-center justify-between rounded-xl bg-brand px-4 text-white"
        >
          <span className="font-medium">{t('about.hotline')}</span>
          <span className="text-2xl font-bold tabular-nums">1342</span>
        </a>
        <a href="https://www.ltfrb.gov.ph" target="_blank" rel="noreferrer" className="text-brand underline">
          {t('about.portal')}: www.ltfrb.gov.ph
        </a>
      </Card>

      <InstallCard dismissible={false} />

      <Card className="flex flex-col gap-3 border-accent/50 bg-accent/10" data-testid="donate-card">
        <h2 className="text-base font-bold text-ink">{t('donate.title')}</h2>
        <p className="text-sm text-ink-2">{t('donate.body')}</p>
        <div className="flex items-start gap-4">
          <img
            src={`${import.meta.env.BASE_URL}gcash-qr.png`}
            alt="GCash QR"
            width={132}
            height={132}
            className="h-33 w-33 shrink-0 rounded-xl bg-white p-1"
          />
          <div className="flex min-w-0 flex-col gap-2 text-sm">
            <p className="font-semibold text-ink">
              GCash · {t('donate.name')}
              <span className="block font-normal tabular-nums text-ink-2">{t('donate.mobile')}</span>
            </p>
            <p className="text-xs text-muted">{t('donate.scan')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openGcash}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0a6cff] px-4 text-sm font-semibold text-white"
                data-testid="open-gcash"
              >
                {t('donate.open')}
              </button>
              <a
                href={`${import.meta.env.BASE_URL}gcash-qr.png`}
                download="magkano-pamasahe-gcash-qr.png"
                className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink-2"
              >
                {t('donate.save')}
              </a>
            </div>
            <p className="text-xs text-muted">{t('donate.note')}</p>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-ink">{t('theme.title')}</h2>
        <Chips<Theme>
          label={t('theme.title')}
          options={[
            { id: 'light', label: t('theme.light') },
            { id: 'dark', label: t('theme.dark') },
            { id: 'system', label: t('theme.system') },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-ink">{t('about.language')}</h2>
        <Chips
          label={t('about.language')}
          options={[
            { id: 'en', label: 'English' },
            { id: 'fil', label: 'Filipino' },
          ]}
          value={lang}
          onChange={setLang}
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-ink">{t('about.rules')}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>{t('about.rule1')}</li>
          <li>{t('about.rule2')}</li>
          <li>{t('about.rule3')}</li>
          <li>{t('about.rule4')}</li>
        </ul>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-ink">{t('about.sources')}</h2>
        <a
          href={manifest.sourceUrl ?? 'https://ltfrb.gov.ph/fare-rates/'}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand underline"
        >
          {t('about.officialSource')}: ltfrb.gov.ph/fare-rates
        </a>
        <p className="text-sm text-ink-2">
          {t('about.dataVersion')}: <span className="font-mono">{manifest.version}</span> ·{' '}
          {formatEffective(manifest.effective, lang)}
        </p>
        <p className="text-xs text-muted">{t('about.offline')}</p>
      </Card>

      <p className="text-xs leading-relaxed text-muted md:col-span-2">{t('about.disclaimer')}</p>
    </main>
  )
}
