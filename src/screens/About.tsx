import { useTranslation } from 'react-i18next'
import { Card, Chips } from '../components/ui'
import { formatEffective, localized } from '../lib/format'
import { useApp } from '../state'

export function About() {
  const { t } = useTranslation()
  const { manifest, modes, lang, setLang } = useApp()
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
      <Card className="flex flex-col gap-3 border-brand/30 bg-brand/5">
        <h2 className="text-base font-bold text-slate-900">{t('about.report')}</h2>
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

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-slate-900">{t('about.language')}</h2>
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
        <h2 className="text-base font-bold text-slate-900">{t('about.rules')}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>{t('about.rule1')}</li>
          <li>{t('about.rule2')}</li>
          <li>{t('about.rule3')}</li>
          <li>{t('about.rule4')}</li>
        </ul>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-slate-900">{t('about.sources')}</h2>
        <a
          href={manifest.sourceUrl ?? 'https://ltfrb.gov.ph/fare-rates/'}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand underline"
        >
          {t('about.officialSource')}: ltfrb.gov.ph/fare-rates
        </a>
        <p className="text-sm text-slate-700">
          {t('about.dataVersion')}: <span className="font-mono">{manifest.version}</span> ·{' '}
          {formatEffective(manifest.effective, lang)}
        </p>
        <ul className="space-y-1 text-xs text-slate-600">
          {modes.map((m) => (
            <li key={m.id}>
              <span className="font-medium text-slate-800">{localized(m.name, lang)}</span>
              {m.sourceDoc && <span> — {m.sourceDoc}</span>}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">{t('about.offline')}</p>
      </Card>

      <p className="text-xs leading-relaxed text-slate-500">{t('about.disclaimer')}</p>
    </main>
  )
}
