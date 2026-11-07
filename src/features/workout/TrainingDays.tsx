import { useCallback, useState } from 'react'
import type { PlanDay } from './api'
import { DayPreview } from './DayPreview'
import { DayView } from './DayView'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

const WEEKDAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

export function TrainingDays({ today, userId, planDays, restSeconds, onSetLogged }: {
  today: string; userId: string; planDays: PlanDay[]; restSeconds: number; onSetLogged: () => void
}) {
  const [pickedDay, setPickedDay] = useState<{ date: string; weekday: number } | null>(null)
  const currentWeekday = new Date(`${today}T12:00:00`).getDay()
  const selected = pickedDay?.date === today ? pickedDay.weekday : currentWeekday
  const weekdays = Array.from({ length: 7 }, (_, offset) => (currentWeekday + offset) % 7)
  const plan = planDays.find((day) => day.weekday === selected)
  // Nur heute wird trainiert. Ein anderer Tag bleibt Vorschau, bis er bewusst für heute übernommen wird.
  const [takenOver, setTakenOver] = useState<string | null>(null)
  const takeOver = useCallback((planDayId: string) => setTakenOver(`${planDayId}:${today}`), [today])
  const canTrain = plan && (selected === currentWeekday || takenOver === `${plan.id}:${today}`)
  return <>
    <nav className="mt-4 flex gap-1 rounded-2xl border border-line/[0.06] bg-surface p-1 lg:mt-0 lg:max-w-xl" aria-label="Trainingstag">
      {weekdays.map((weekday) => <button key={weekday} type="button" aria-pressed={selected === weekday}
        aria-current={weekday === currentWeekday ? 'date' : undefined}
        className={`relative min-h-11 min-w-0 flex-1 rounded-xl text-sm transition-all active:scale-95 ${selected === weekday ? 'bg-neon font-semibold text-black shadow-sm' : 'text-foreground/75 hover:text-foreground'}`}
        onClick={() => setPickedDay({ date: today, weekday })}>
        {WEEKDAYS[weekday]}
        {weekday === currentWeekday && weekday !== selected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-neon" />}
      </button>)}
    </nav>
    {plan && !canTrain && <DayPreview key={`${plan.id}:${today}`} planDayId={plan.id} today={today} dayName={plan.name}
      dayLabel={WEEKDAY_NAMES[selected]} onTakeOver={takeOver} />}
    {plan && canTrain && <>
      <DayView key={`${plan.id}:${today}`} planDayId={plan.id} userId={userId} today={today} dayName={plan.name}
        dayLabel={selected === currentWeekday ? 'Heute' : WEEKDAY_NAMES[selected]} restSeconds={restSeconds} onSetLogged={onSetLogged} />
    </>}
    {!plan && <div className="mt-12 rounded-2xl border border-line/[0.08] bg-surface px-6 py-12 text-center">
      <p className="text-lg font-semibold text-foreground">{selected === currentWeekday ? 'Heute ist Ruhetag' : 'An diesem Tag ist Ruhetag'}</p>
      <p className="mt-1 text-sm text-muted">Oben kannst du dir die anderen Trainingstage ansehen.</p>
    </div>}
  </>
}
