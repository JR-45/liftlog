import { weekStreak } from '../../domain/motivation'
import { formatRange } from '../../domain/sets'
import { gymWeeks } from '../../domain/social'
import { CheckIcon, FlameIcon, SnowflakeIcon } from '../../lib/icons'
import { CARD, SECTION_TITLE } from '../../lib/ui'
import type { SharedOverview } from './api'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const WEEKDAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

/** Was Follower sehen: die laufende Woche, die Serie und den Plan, wenn er veröffentlicht ist. */
export function SharedProfileOverview({ overview, today }: { overview: SharedOverview; today: string }) {
  const week = gymWeeks(overview.gymDays, today, 1)[0]
  const thisWeek = week.filter((day) => day.trained).length
  const streak = weekStreak(overview.gymDays, today)
  return <>
    <section className={CARD} aria-labelledby="gym-days-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="gym-days-heading" className={SECTION_TITLE}>Diese Woche</h3>
          <p className="mt-1 text-sm tabular-nums text-muted">{thisWeek} / {overview.profile.weeklyTarget} Tage</p>
        </div>
        {/* Ohne Serie Eis, mit Serie Feuer. */}
        <div className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 ${streak > 0 ? 'bg-warning/15 text-warning' : 'bg-neon/10 text-accent-ink'}`}
          aria-label={`Wochen-Streak: ${streak}`}>
          {streak > 0 ? <FlameIcon className="h-6 w-6" /> : <SnowflakeIcon className="h-6 w-6" />}
          <span className="text-left leading-tight"><span className="block text-xl font-extrabold tabular-nums">{streak}</span><span className="block text-[11px] font-medium">Wochen-Streak</span></span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs text-muted" aria-hidden="true">{DAYS.map((day) => <span key={day}>{day}</span>)}</div>
      <ul className="mt-1.5 grid grid-cols-7 gap-1.5" aria-label="Trainingstage dieser Woche">
          {week.map((day) => <li key={day.date} aria-label={`${day.date.split('-').reverse().join('.')}: ${day.trained ? 'trainiert' : 'kein Training'}`}
            className={`flex aspect-square items-center justify-center rounded-lg ${day.trained ? 'bg-success text-black' : day.future ? 'bg-transparent' : 'bg-control'} ${day.date === today ? 'ring-2 ring-neon' : ''}`}>
            {day.trained && <CheckIcon className="h-4 w-4 stroke-[3]" />}
          </li>)}
      </ul>
    </section>
    {overview.plan && <section className={CARD} aria-labelledby="shared-plan-heading">
      <h3 id="shared-plan-heading" className={SECTION_TITLE}>Trainingsplan</h3>
      {!overview.plan.length && <p className="mt-2 text-sm text-muted">Noch kein Plan.</p>}
      <ul className="mt-2 divide-y divide-line/[0.06]">
        {overview.plan.map((day) => <li key={day.weekday}>
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2">
              <span className="font-medium text-foreground"><span className="mr-2 text-muted">{WEEKDAY[day.weekday]}</span>{day.name}</span>
              <span className="text-sm text-muted">{day.exercises.length} {day.exercises.length === 1 ? 'Übung' : 'Übungen'}</span>
            </summary>
            <ul className="pb-2 text-sm text-muted">
              {day.exercises.map((exercise, index) => <li key={index} className="flex justify-between gap-3 py-0.5">
                <span className="truncate">{exercise.name}</span>
                <span className="shrink-0 tabular-nums">{formatRange(exercise.setsMin, exercise.setsMax)} × {exercise.repsMin !== null ? formatRange(exercise.repsMin, exercise.repsMax) : `${formatRange(exercise.durationMin, exercise.durationMax)} Sek.`}</span>
              </li>)}
            </ul>
          </details>
        </li>)}
      </ul>
    </section>}
  </>
}
