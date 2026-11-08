import type { WorkoutSummaryData } from '../../domain/summary'
import { TrophyIcon } from '../../lib/icons'

const VOLUME_FORMAT = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

type Props = {
  summary: WorkoutSummaryData
  finished: boolean
}

export function WorkoutSummary({ summary, finished }: Props) {
  if (summary.totalSets === 0) return null

  return (
    <section
      aria-label="Trainings-Zusammenfassung"
      className={`rounded-2xl border p-4 transition-colors ${
        finished
          ? 'border-success/30 bg-gradient-to-b from-success/12 to-surface'
          : 'border-line/[0.08] bg-surface'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              finished ? 'bg-success-fill text-black' : 'bg-neon/15 text-accent-ink'
            }`}
          >
            <TrophyIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {finished ? 'Training abgeschlossen' : 'Heutige Bilanz'}
            </h3>
            <p className="text-xs text-muted">
              {finished ? 'Starke Leistung heute!' : 'Live-Zusammenfassung deiner gespeicherten Sätze'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-control/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Volumen</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
            {VOLUME_FORMAT.format(summary.totalVolumeKg)} <span className="text-xs font-normal text-muted">kg</span>
          </p>
        </div>
        <div className="rounded-xl bg-control/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sätze</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{summary.totalSets}</p>
        </div>
        <div className="rounded-xl bg-control/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Wdh.</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{summary.totalReps}</p>
        </div>
      </div>

      {summary.improved.length > 0 && (
        <div className="mt-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-success">Gesteigert gegenüber letztem Mal</p>
          <ul className="mt-1.5 space-y-1.5">
            {summary.improved.map((item) => (
              <li
                key={item.exerciseId}
                className="flex items-center justify-between gap-2 rounded-xl bg-success/12 px-3 py-2 text-sm ring-1 ring-success/25"
              >
                <span className="truncate font-medium text-foreground">{item.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-success">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.progressingNext.length > 0 && (
        <div className="mt-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-ink">Nächstes Training schwerer</p>
          <ul className="mt-1.5 space-y-1.5">
            {summary.progressingNext.map((item) => (
              <li
                key={item.exerciseId}
                className="flex items-center justify-between gap-2 rounded-xl bg-neon/12 px-3 py-2 text-sm ring-1 ring-neon/25"
              >
                <span className="truncate font-medium text-foreground">{item.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-accent-ink">{item.planned}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
