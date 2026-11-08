import { useEffect, useState } from 'react'
import { localDateString } from '../../domain/sets'
import { weightTrend } from '../../domain/weightTrend'
import { loadWeightHistory } from './api'

const SHORT_DATE = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })
const shortDate = (date: string) => SHORT_DATE.format(new Date(`${date}T12:00:00`))
const kg = (value: number) => `${String(Math.round(value * 10) / 10).replace('.', ',')} kg`

/** Gewicht der letzten drei Monate aus den Körperdaten, mit Zielgewicht als Linie. */
export function WeightCard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadWeightHistory>> | null>(null)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadWeightHistory().then((value) => { if (!cancelled) setData(value) }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  const trend = data ? weightTrend(data.entries, localDateString(), data.targetKg) : null
  // Ohne Gewicht oder bei einem Ladefehler bleibt die Statistik ohne diese Karte.
  if (failed || !data || !trend) return null

  const width = 320
  const height = 140
  const padX = 18
  const padY = 16
  const coords = trend.points.map((point) => ({ ...point, cx: padX + point.x * (width - padX * 2), cy: padY + point.y * (height - padY * 2) }))
  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.cx.toFixed(1)} ${point.cy.toFixed(1)}`).join(' ')
  const targetCy = trend.targetY === null ? null : padY + trend.targetY * (height - padY * 2)
  const inspected = coords[active ?? coords.length - 1]
  const change = trend.changeKg
  // Grün, wenn es Richtung Ziel geht. Ohne Ziel neutral.
  const towardTarget = change !== null && data.targetKg !== null && change !== 0 && Math.sign(change) === Math.sign(data.targetKg - coords[0].weightKg)

  return <section className="mt-6" aria-labelledby="weight-heading">
    <h2 id="weight-heading" className="text-xl font-bold tracking-tight text-foreground">Gewicht</h2>
    <div className="mt-3 rounded-2xl border border-line/[0.08] bg-surface p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-control/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Aktuell</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-foreground">{kg(trend.latestKg)}</p>
        </div>
        <div className="rounded-xl bg-control/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">3 Monate</p>
          <p className={`mt-0.5 truncate text-sm font-bold tabular-nums ${towardTarget ? 'text-success' : 'text-foreground'}`}>
            {change === null ? '—' : `${change > 0 ? '+' : change < 0 ? '−' : '±'}${kg(Math.abs(change))}`}
          </p>
        </div>
        <div className="rounded-xl bg-control/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Ziel</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-accent-ink">{data.targetKg === null ? '—' : kg(data.targetKg)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>{shortDate(inspected.date)}</span>
        <span className="font-semibold tabular-nums text-foreground">{kg(inspected.weightKg)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-40 w-full overflow-visible" role="img"
        aria-label={`Gewichtsverlauf: ${kg(coords[0].weightKg)} am ${shortDate(coords[0].date)}, jetzt ${kg(trend.latestKg)}`}>
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="var(--chart-grid)" />
        {targetCy !== null && <line x1={padX} y1={targetCy} x2={width - padX} y2={targetCy} stroke="var(--color-accent-ink)" strokeOpacity="0.6" strokeDasharray="4 4" />}
        {coords.length > 1 && <path d={line} fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {coords.map((point, index) => <g key={point.date} className="cursor-pointer" onClick={() => setActive(index)}>
          <circle cx={point.cx} cy={point.cy} r="14" fill="transparent" />
          <circle cx={point.cx} cy={point.cy} r={point === inspected ? 5.5 : 3.5} fill={point === inspected ? 'var(--color-accent-ink)' : 'var(--color-success)'} stroke="var(--color-surface)" strokeWidth="2" />
        </g>)}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
        <span>{shortDate(coords[0].date)}</span>
        {coords.length > 1 && <span>{shortDate(coords[coords.length - 1].date)}</span>}
      </div>
    </div>
  </section>
}
