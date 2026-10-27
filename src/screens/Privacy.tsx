import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui'
import { PRIVACY_CONTACT, PRIVACY_EFFECTIVE, privacy } from '../content/privacy'
import { formatEffective } from '../lib/format'
import { useApp } from '../state'

export function Privacy() {
  const { t } = useTranslation()
  const { lang } = useApp()
  const doc = privacy[lang] ?? privacy.en
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 md:max-w-3xl md:px-8 md:py-6" data-testid="privacy">
      <p className="text-xs text-muted">{t('privacy.effective', { date: formatEffective(PRIVACY_EFFECTIVE, lang) })}</p>
      <p className="text-sm leading-relaxed text-ink-2">{doc.intro}</p>
      {doc.sections.map((s) => (
        <Card key={s.title} className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-ink">{s.title}</h2>
          {s.body.map((para) => (
            <p key={para} className="text-sm leading-relaxed text-ink-2">
              {para}
            </p>
          ))}
        </Card>
      ))}
      <a href={PRIVACY_CONTACT} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
        {t('privacy.contact')}
      </a>
    </main>
  )
}
