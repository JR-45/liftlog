import type { ScheduledDay } from '../../domain/week'
import { shiftDate, weekStart } from '../../domain/week'
import type { PlanDay, WeekWorkout } from './api'

const DAY = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const SHORT = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' })
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const BUTTON = 'min-h-11 rounded-lg border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40'

export function WeekPlanner({ selectedDate, today, days, planDays, workouts, editable, dirty, busy, onDate, onChange, onSave, onDiscard, onTemplate }: {
  selectedDate: string; today: string; days: ScheduledDay[]; planDays: PlanDay[]; workouts: WeekWorkout[]
  editable: boolean; dirty: boolean; busy: boolean
  onDate: (date: string) => void; onChange: (index: number, value: string) => void
  onSave: () => void; onDiscard: () => void; onTemplate: () => void
}) {
  const start = weekStart(selectedDate)
  return <section aria-label="Wochenplanung" className="mt-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">{editable ? 'Deine Wochenplanung' : 'Deine Trainingswoche'}</h2>
        <p className="mt-1 text-sm text-neutral-400">{SHORT.format(new Date(`${start}T12:00:00`))} – {SHORT.format(new Date(`${shiftDate(start, 6)}T12:00:00`))} {start.slice(0, 4)}</p></div>
      <div className="flex gap-2">
        <button className={BUTTON} type="button" aria-label="Vorherige Woche" disabled={dirty || busy} onClick={() => onDate(shiftDate(selectedDate, -7))}>‹</button>
        <button className={BUTTON} type="button" disabled={dirty || busy} onClick={() => onDate(today)}>Diese Woche</button>
        <button className={BUTTON} type="button" aria-label="Nächste Woche" disabled={dirty || busy} onClick={() => onDate(shiftDate(selectedDate, 7))}>›</button>
      </div>
    </div>
    <label className="mt-4 block max-w-xs text-sm text-neutral-400">Woche auswählen
      <input className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base text-neutral-100 disabled:opacity-40"
        type="date" value={selectedDate} min="1900-01-01" max="2199-12-31" disabled={dirty || busy}
        onChange={(event) => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) onDate(event.target.value) }} />
    </label>
    {editable && <p className="mt-3 text-sm text-neutral-400">Jede neue Woche übernimmt deinen gespeicherten Wochenplan. Du entscheidest für jeden Tag selbst, ob und was du trainierst.</p>}
    <div className={`mt-4 grid gap-2 ${editable ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-4 md:grid-cols-7'}`}>
      {days.map((day, index) => {
        const plan = planDays.find((item) => item.id === day.plan_day_id)
        const label = DAY.format(new Date(`${day.day_date}T12:00:00`))
        const trained = workouts.some((workout) => workout.performed_on === day.day_date)
        return <div key={day.day_date} className={`min-w-0 rounded-xl border ${selectedDate === day.day_date ? 'border-yellow-400 bg-yellow-400/5' : 'border-neutral-800 bg-neutral-800/30'}`}>
          <button className="min-h-16 w-full p-3 text-left" type="button" aria-pressed={selectedDate === day.day_date} aria-label={`${label} auswählen`} disabled={busy} onClick={() => onDate(day.day_date)}>
            <span className={`block text-sm font-medium ${selectedDate === day.day_date ? 'text-yellow-300' : ''}`}>{WEEKDAYS[new Date(`${day.day_date}T12:00:00`).getDay()]} {SHORT.format(new Date(`${day.day_date}T12:00:00`))}</span>
            <span className="mt-1 block break-words text-xs text-neutral-400">{plan?.name ?? (day.is_rest_day ? 'Ruhetag' : 'Ungeplant')}</span>
            {trained && <span className="mt-1 block text-xs text-yellow-300">✓ Trainiert</span>}
            {day.day_date === today && <span className="block text-xs text-neutral-400">Heute</span>}
          </button>
          {editable && <label className="block px-3 pb-3 text-xs text-neutral-400">Plan für {label}
            <select className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-sm text-neutral-100" disabled={busy}
              value={day.plan_day_id ?? (day.is_rest_day ? 'rest' : 'unplanned')} onChange={(event) => onChange(index, event.target.value)}>
              <option value="unplanned">Ungeplant</option><option value="rest">Ruhetag</option>
              {planDays.map((item) => <option key={item.id} value={item.id}>{item.name} · Vorlage {WEEKDAYS[item.weekday]}</option>)}
            </select>
          </label>}
        </div>
      })}
    </div>
    {editable && <div className="mt-4 flex flex-wrap gap-2">
      <button className="min-h-11 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-40" type="button" disabled={busy} onClick={onSave}>{busy ? 'Wird gespeichert …' : 'Woche speichern'}</button>
      <button className={BUTTON} type="button" disabled={busy || !dirty} onClick={onDiscard}>Änderungen verwerfen</button>
      <button className={BUTTON} type="button" disabled={busy} onClick={onTemplate}>Wochenvorlage übernehmen</button>
    </div>}
    {dirty && <p role="status" className="mt-3 text-sm text-yellow-300">Ungespeicherte Woche: Speichere oder verwirf die Änderungen vor dem Wochenwechsel.</p>}
  </section>
}
