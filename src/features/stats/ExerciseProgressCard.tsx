import { useMemo, useState } from 'react'
import type { ExportRow } from '../../domain/export'
import { buildExerciseProgress, listTrackedExercises } from '../../domain/progress'

const SHORT_DATE = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

function formatShortDate(date: string): string {
  return SHORT_DATE.format(new Date(`${date}T12:00:00`))
}

export function ExerciseProgressCard({ rows }: { rows: ExportRow[] }) {
  const exercises = useMemo(() => listTrackedExercises(rows), [rows])
  const [selected, setSelected] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const currentExercise = selected && exercises.includes(selected) ? selected : (exercises[0] ?? null)
  const progress = useMemo(
    () => (currentExercise ? buildExerciseProgress(rows, currentExercise) : null),
    [rows, currentExercise],
  )

  if (exercises.length === 0 || !progress) {
    return (
      <section className="mt-6">
        <h2 className="text-xl font-bold tracking-tight text-white">Fortschritt pro Übung</h2>
        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
          <p className="text-sm text-[#8E8E93]">
            Sobald du erste Sätze im Training abhakst, erscheint hier deine Kraft- und Fortschrittskurve.
          </p>
        </div>
      </section>
    )
  }

  const width = 320
  const height = 140
  const padX = 18
  const padY = 20
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const coords = progress.points.map((point) => ({
    ...point,
    cx: padX + point.normX * innerW,
    cy: padY + (1 - point.normY) * innerH,
  }))

  const linePath = coords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.cx.toFixed(1)} ${pt.cy.toFixed(1)}`).join(' ')
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].cx.toFixed(1)} ${(height - padY).toFixed(1)} L ${coords[0].cx.toFixed(1)} ${(height - padY).toFixed(1)} Z`
      : ''

  const inspected =
    activeIndex !== null && coords[activeIndex] ? coords[activeIndex] : coords[coords.length - 1]

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight text-white">Fortschritt pro Übung</h2>
        <select
          aria-label="Übung für Fortschritts-Diagramm wählen"
          className="h-11 rounded-xl border border-white/[0.08] bg-[#1C1C1E] px-3 text-sm font-medium text-white outline-none focus:border-neon"
          value={currentExercise ?? ''}
          onChange={(event) => {
            setSelected(event.target.value)
            setActiveIndex(null)
          }}
        >
          {exercises.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#2C2C2E]/70 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">Letztes Mal</p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-white">{progress.latestLabel}</p>
          </div>
          <div className="rounded-xl bg-[#2C2C2E]/70 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">Bestwert</p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-neon">{progress.bestLabel}</p>
          </div>
          <div className="rounded-xl bg-[#2C2C2E]/70 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">Entwicklung</p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#30D158]">
              {progress.deltaLabel ?? '1 Training'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>
              Ausgewählt: <strong className="font-semibold text-white">{formatShortDate(inspected.date)}</strong>
            </span>
            <span className="font-semibold tabular-nums text-[#30D158]">{inspected.label}</span>
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="mt-2 h-40 w-full overflow-visible"
            role="img"
            aria-label={`Fortschritts-Diagramm für ${progress.exercise}`}
          >
            <defs>
              <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#30D158" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#30D158" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <line
              x1={padX}
              y1={padY}
              x2={width - padX}
              y2={padY}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <line
              x1={padX}
              y1={height / 2}
              x2={width - padX}
              y2={height / 2}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <line
              x1={padX}
              y1={height - padY}
              x2={width - padX}
              y2={height - padY}
              stroke="rgba(255,255,255,0.08)"
            />

            {areaPath && <path d={areaPath} fill="url(#progressFill)" />}
            {coords.length > 1 && (
              <path
                d={linePath}
                fill="none"
                stroke="#30D158"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {coords.map((pt, index) => {
              const isSelected = inspected.date === pt.date
              return (
                <g
                  key={pt.date}
                  className="cursor-pointer"
                  onClick={() => setActiveIndex(index)}
                >
                  <circle cx={pt.cx} cy={pt.cy} r="14" fill="transparent" />
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={isSelected ? 5.5 : 4}
                    fill={isSelected ? '#18E0FF' : '#30D158'}
                    stroke="#1C1C1E"
                    strokeWidth="2"
                  />
                </g>
              )
            })}
          </svg>

          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[#8E8E93]">
            <span>{formatShortDate(coords[0].date)}</span>
            {coords.length > 1 && <span>{formatShortDate(coords[coords.length - 1].date)}</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
