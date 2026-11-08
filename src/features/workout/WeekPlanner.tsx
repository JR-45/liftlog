import type { ScheduledDay } from '../../domain/week'
import { shiftDate, weekStart } from '../../domain/week'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '../../lib/icons'
import { NAV_BUTTON } from '../../lib/ui'
import type { PlanDay, WeekWorkout } from './api'

const DAY = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const SHORT = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const LINK = 'min-h-11 px-2 text-sm font-medium text-muted disabled:opacity-40'

export function WeekPlanner({ selectedDate, today, home, days, planDays, workouts, dirty, busy, onDate, onChange, onSave, onDiscard, onTemplate }: {
  /** home: Startdatum der Planung, sonntags schon die kommende Woche. */
  selectedDate: string; today: string; home: string; days: ScheduledDay[]; planDays: PlanDay[]; workouts: WeekWorkout[]
  dirty: boolean; busy: boolean
  onDate: (date: string) => void; onChange: (index: number, value: string) => void
  onSave: () => void; onDiscard: () => void; onTemplate: () => void
}) {
  const start = weekStart(selectedDate)
  return <section aria-label="Wochenplanung" className="mt-4">
    <div className="flex items-center justify-between gap-2">
      <button className={NAV_BUTTON} type="button" aria-label="Vorherige Woche" disabled={dirty || busy} onClick={() => onDate(shiftDate(selectedDate, -7))}><ChevronLeftIcon className="h-5 w-5" /></button>
      <div className="min-w-0 text-center">
        <h2 className="text-xl">Deine Wochenplanung</h2>
        <p className="text-sm tabular-nums text-muted">{SHORT.format(new Date(`${start}T12:00:00`))} – {SHORT.format(new Date(`${shiftDate(start, 6)}T12:00:00`))}</p>
      </div>
      <button className={NAV_BUTTON} type="button" aria-label="Nächste Woche" disabled={dirty || busy} onClick={() => onDate(shiftDate(selectedDate, 7))}><ChevronRightIcon className="h-5 w-5" /></button>
    </div>
    {weekStart(home) !== start && (
      <div className="mt-2 text-center">
        <button className={LINK} type="button" disabled={dirty || busy} onClick={() => onDate(home)}>{weekStart(home) === weekStart(today) ? 'Zurück zu dieser Woche' : 'Zur kommenden Woche'}</button>
      </div>
    )}

    <ul className="mt-3 divide-y divide-line/[0.06] rounded-2xl bg-surface px-3 ring-1 ring-line/[0.08] md:grid md:grid-cols-2 md:gap-x-6 md:divide-y-0">
      {days.map((day, index) => {
        const date = new Date(`${day.day_date}T12:00:00`)
        const trained = workouts.some((workout) => workout.performed_on === day.day_date)
        const isToday = day.day_date === today
        // Vergangene Tage bleiben änderbar, sind aber blass, damit man nicht aus Versehen dort plant.
        return <li key={day.day_date} className={`flex items-center gap-3 py-2 ${day.day_date < today ? 'opacity-45' : ''}`}>
          <span className="w-16 shrink-0">
            <span className={`block text-sm font-semibold ${isToday ? 'text-accent-ink' : 'text-foreground'}`}>{WEEKDAYS[date.getDay()]}</span>
            <span className="block text-xs tabular-nums text-muted">{SHORT.format(date)}</span>
          </span>
          <select className="h-11 min-w-0 flex-1 rounded-xl bg-control px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-neon" disabled={busy}
            aria-label={`Plan für ${DAY.format(date)}`}
            value={day.plan_day_id ?? (day.is_rest_day ? 'rest' : 'unplanned')} onChange={(event) => onChange(index, event.target.value)}>
            <option value="unplanned">Ungeplant</option>
            <option value="rest">Ruhetag</option>
            {planDays.map((item) => <option key={item.id} value={item.id}>{item.name} ({WEEKDAYS[item.weekday]})</option>)}
          </select>
          <span className="flex w-5 shrink-0 justify-center text-success" role={trained ? 'img' : undefined} aria-label={trained ? 'Trainiert' : undefined}>
            {trained && <CheckIcon className="h-4 w-4 stroke-[3]" />}
          </span>
        </li>
      })}
    </ul>

    {dirty ? (
      <div className="mt-3 flex items-center gap-2">
        <button className="min-h-12 flex-1 rounded-xl bg-neon px-4 py-2 font-semibold text-black disabled:opacity-40" type="button" disabled={busy} onClick={onSave}>
          {busy ? 'Wird gespeichert …' : 'Woche speichern'}
        </button>
        <button className={LINK} type="button" disabled={busy} onClick={onDiscard}>Verwerfen</button>
      </div>
    ) : (
      <button className={`${LINK} mt-2`} type="button" disabled={busy} onClick={onTemplate}>Vorlage übernehmen</button>
    )}
  </section>
}
