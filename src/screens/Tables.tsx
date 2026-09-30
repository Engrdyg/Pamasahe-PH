import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPesos, generateTable, toCentavos, type DistanceMode, type MatrixMode } from '../engine'
import { Card, Chips, NumberField, Select } from '../components/ui'
import { localized } from '../lib/format'
import { useApp } from '../state'

export function Tables() {
  const { t } = useTranslation()
  const { modes, lang } = useApp()
  const tabular = modes.filter(
    (m) => ((m.method === 'ADD_ON' || m.method === 'PER_KM') && m.tableRange) || m.method === 'MATRIX',
  )
  const [modeId, setModeId] = useState(tabular[0]?.id ?? '')
  const mode = tabular.find((m) => m.id === modeId) ?? tabular[0]

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-4">
      <Select
        label={t('tables.mode')}
        value={mode?.id ?? ''}
        options={tabular.map((m) => m.id)}
        onChange={setModeId}
      />
      {/* The select shows ids; render the human name too */}
      {mode && <p className="text-sm font-medium text-slate-800">{localized(mode.name, lang)}</p>}
      {mode?.method === 'MATRIX' ? <MatrixTable mode={mode} /> : mode ? <KmTable mode={mode as DistanceMode} /> : null}
    </main>
  )
}

function KmTable({ mode }: { mode: DistanceMode }) {
  const { t } = useTranslation()
  const [find, setFind] = useState('')
  const rows = useMemo(() => generateTable(mode), [mode])
  const findNum = Number(find)
  const hasOld = Boolean(mode.previous)
  const highlight = find.trim() !== '' && Number.isFinite(findNum) ? Math.ceil(findNum) : null
  const visible = highlight == null ? rows : rows.filter((r) => r.chargedKm >= highlight - 2 * (mode.tableRange?.stepKm ?? 1))

  return (
    <>
      <Card>
        <NumberField label={t('tables.searchKm')} value={find} onChange={setFind} min={mode.tableRange?.minKm} unit={t('common.km')} />
      </Card>
      <p className="text-xs text-slate-500">{t('tables.generated')}</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm tabular-nums" data-testid="km-table">
          <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th rowSpan={2} className="px-2 py-2 text-left">{t('tables.km')}</th>
              <th colSpan={2} className="px-2 py-1 text-center">{t('tables.new')}</th>
              {hasOld && <th colSpan={2} className="px-2 py-1 text-center">{t('tables.old')}</th>}
            </tr>
            <tr>
              <th className="px-2 py-1 text-right">{t('fare.regular')}</th>
              <th className="px-2 py-1 text-right">{t('fare.discounted')}</th>
              {hasOld && <th className="px-2 py-1 text-right">{t('fare.regular')}</th>}
              {hasOld && <th className="px-2 py-1 text-right">{t('fare.discounted')}</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.km}
                className={`border-t border-slate-100 ${highlight != null && r.chargedKm >= highlight && r.chargedKm - (mode.tableRange?.stepKm ?? 1) < highlight ? 'bg-accent/20 font-semibold' : ''}`}
              >
                <td className="px-2 py-1.5">{r.km}</td>
                <td className="px-2 py-1.5 text-right">{formatPesos(r.regular)}</td>
                <td className="px-2 py-1.5 text-right">{formatPesos(r.discounted)}</td>
                {hasOld && <td className="px-2 py-1.5 text-right text-slate-500">{formatPesos(r.previous!.regular)}</td>}
                {hasOld && <td className="px-2 py-1.5 text-right text-slate-500">{formatPesos(r.previous!.discounted)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function MatrixTable({ mode }: { mode: MatrixMode }) {
  const { t } = useTranslation()
  const dirs = Object.keys(mode.directions)
  const [dir, setDir] = useState(dirs[0])
  const d = mode.directions[dir]
  const [from, setFrom] = useState(d.stations[0])
  const i = Math.max(0, d.stations.indexOf(from))

  return (
    <>
      <Card className="flex flex-col gap-4">
        <Chips
          label={t('input.direction')}
          options={dirs.map((x) => ({ id: x, label: t(`input.${x}`) }))}
          value={dir}
          onChange={(x) => {
            setDir(x)
            setFrom(mode.directions[x].stations[0])
          }}
        />
        <Select label={t('tables.from')} value={d.stations[i]} options={d.stations} onChange={setFrom} />
      </Card>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm tabular-nums">
          <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-2 py-2 text-left">{t('input.destination')}</th>
              <th className="px-2 py-2 text-right">{t('fare.regular')}</th>
              <th className="px-2 py-2 text-right">{t('fare.discounted')}</th>
            </tr>
          </thead>
          <tbody>
            {d.stations.slice(i + 1).map((s, k) => {
              const j = i + 1 + k
              return (
                <tr key={s} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">{s}</td>
                  <td className="px-2 py-1.5 text-right">{formatPesos(toCentavos(d.regular[i][j]!))}</td>
                  <td className="px-2 py-1.5 text-right">{formatPesos(toCentavos(d.discounted[i][j]!))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
