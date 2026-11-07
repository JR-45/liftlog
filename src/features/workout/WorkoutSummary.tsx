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
          ? 'border-[#30D158]/30 bg-gradient-to-b from-[#30D158]/12 to-[#1C1C1E]'
          : 'border-white/[0.08] bg-[#1C1C1E]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              finished ? 'bg-[#30D158] text-black' : 'bg-[#FFD60A]/15 text-[#FFD60A]'
            }`}
          >
            <TrophyIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-bold tracking-tight text-white">
              {finished ? 'Training abgeschlossen' : 'Heutige Bilanz'}
            </h3>
            <p className="text-xs text-[#8E8E93]">
              {finished ? 'Starke Leistung heute!' : 'Live-Zusammenfassung deiner gespeicherten Sätze'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[#2C2C2E]/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">Volumen</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
            {VOLUME_FORMAT.format(summary.totalVolumeKg)} <span className="text-xs font-normal text-[#8E8E93]">kg</span>
          </p>
        </div>
        <div className="rounded-xl bg-[#2C2C2E]/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">Sätze</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{summary.totalSets}</p>
        </div>
        <div className="rounded-xl bg-[#2C2C2E]/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">Wdh.</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{summary.totalReps}</p>
        </div>
      </div>

      {summary.improved.length > 0 && (
        <div className="mt-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#30D158]">Gesteigert gegenüber letztem Mal</p>
          <ul className="mt-1.5 space-y-1.5">
            {summary.improved.map((item) => (
              <li
                key={item.exerciseId}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#30D158]/12 px-3 py-2 text-sm ring-1 ring-[#30D158]/25"
              >
                <span className="truncate font-medium text-white">{item.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-[#30D158]">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.progressingNext.length > 0 && (
        <div className="mt-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FFD60A]">Nächstes Training schwerer</p>
          <ul className="mt-1.5 space-y-1.5">
            {summary.progressingNext.map((item) => (
              <li
                key={item.exerciseId}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#FFD60A]/12 px-3 py-2 text-sm ring-1 ring-[#FFD60A]/25"
              >
                <span className="truncate font-medium text-white">{item.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-[#FFD60A]">{item.planned}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
