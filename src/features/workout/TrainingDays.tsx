import { useState } from 'react'
import type { PlanDay } from './api'
import { DayView } from './DayView'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function TrainingDays({ today, userId, planDays, onSetLogged }: {
  today: string; userId: string; planDays: PlanDay[]; onSetLogged: () => void
}) {
  const [pickedWeekday, setPickedWeekday] = useState<number | null>(null)
  const currentWeekday = new Date(`${today}T12:00:00`).getDay()
  const selected = pickedWeekday ?? currentWeekday
  const plan = planDays.find((day) => day.weekday === selected)
  return <>
    <nav className="mt-4 flex gap-1 rounded-2xl border border-line/[0.06] bg-surface p-1 lg:mt-0 lg:max-w-xl" aria-label="Trainingstag">
      {planDays.map((day) => <button key={day.id} type="button" aria-pressed={selected === day.weekday}
        className={`relative min-h-11 flex-1 rounded-xl text-sm transition-all active:scale-95 ${selected === day.weekday ? 'bg-accent font-semibold text-black shadow-sm' : 'text-foreground/75 hover:text-foreground'}`}
        onClick={() => setPickedWeekday(day.weekday)}>
        {WEEKDAYS[day.weekday]}
        {day.weekday === currentWeekday && day.weekday !== selected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-yellow-400" />}
      </button>)}
    </nav>
    {plan ? <>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground">{plan.name}</h2>
      <DayView key={`${plan.id}:${today}`} planDayId={plan.id} userId={userId} today={today} onSetLogged={onSetLogged} />
    </> : <div className="mt-12 rounded-2xl border border-line/[0.08] bg-surface px-6 py-12 text-center">
      <p className="text-lg font-semibold text-foreground">Heute ist Ruhetag</p>
      <p className="mt-1 text-sm text-muted">Oben kannst du trotzdem einen Trainingstag wählen.</p>
    </div>}
  </>
}
