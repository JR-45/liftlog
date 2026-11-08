import { useCallback, useState } from 'react'
import { planForDate, shiftDate, type ScheduledDay } from '../../domain/week'
import type { PlanDay } from './api'
import { DayPreview } from './DayPreview'
import { DayView } from './DayView'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WEEKDAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

/**
 * Heute und die nächsten 6 Tage. Was an einem Tag dran ist, kommt aus der Wochenplanung,
 * sonst aus der Vorlage. schedule null: Wochenplanung lädt noch.
 */
export function TrainingDays({ today, userId, planDays, schedule, restSeconds, onSetLogged }: {
  today: string; userId: string; planDays: PlanDay[]; schedule: ScheduledDay[] | null; restSeconds: number; onSetLogged: () => void
}) {
  const [picked, setPicked] = useState<{ today: string; date: string } | null>(null)
  const dates = Array.from({ length: 7 }, (_, offset) => shiftDate(today, offset))
  const selectedDate = picked?.today === today ? picked.date : today
  const isToday = selectedDate === today
  const weekday = new Date(`${selectedDate}T12:00:00`).getDay()
  const dayPlan = planForDate(selectedDate, planDays, schedule ?? [])
  const plan = planDays.find((day) => day.id === dayPlan.planDayId)
  // Nur heute wird trainiert. Ein anderer Tag bleibt Vorschau, bis er bewusst für heute übernommen wird.
  const [choice, setChoice] = useState<{ key: string; train: boolean } | null>(null)
  const key = plan ? `${plan.id}:${today}` : ''
  const takeOver = useCallback((planDayId: string) => setChoice({ key: `${planDayId}:${today}`, train: true }), [today])
  const canTrain = plan && (isToday || (choice?.key === key && choice.train))
  const restText = dayPlan.kind === 'unplanned' ? 'nichts geplant' : 'Ruhetag'

  return <>
    <nav className="mt-4 flex gap-1 rounded-2xl border border-line/[0.06] bg-surface p-1 lg:mt-0 lg:max-w-xl" aria-label="Trainingstag">
      {dates.map((date) => {
        const selected = date === selectedDate
        return <button key={date} type="button" aria-pressed={selected}
          aria-current={date === today ? 'date' : undefined}
          className={`relative min-h-11 min-w-0 flex-1 rounded-xl text-sm transition-all active:scale-95 ${selected ? 'bg-neon font-semibold text-black shadow-sm' : 'text-foreground/75 hover:text-foreground'}`}
          onClick={() => setPicked({ today, date })}>
          {WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]}
          {date === today && !selected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-neon" />}
        </button>
      })}
    </nav>
    {/* Erst wenn die Wochenplanung da ist, sonst stünde kurz der falsche Tag aus der Vorlage da. */}
    {schedule === null ? <p className="mt-6 text-sm text-muted">Wird geladen …</p> : <>
      {plan && !canTrain && <DayPreview key={key} planDayId={plan.id} today={today} dayName={plan.name}
        dayLabel={WEEKDAY_NAMES[weekday]} resume={choice?.key !== key} onTakeOver={takeOver} />}
      {plan && canTrain && <>
        {!isToday && <button type="button" className="mt-3 min-h-11 text-sm font-medium text-accent-ink" onClick={() => setChoice({ key, train: false })}>
          ‹ Zurück zur Vorschau
        </button>}
        <DayView key={`${plan.id}:${today}`} planDayId={plan.id} userId={userId} today={today} dayName={plan.name}
          dayLabel={isToday ? 'Heute' : WEEKDAY_NAMES[weekday]} restSeconds={restSeconds} onSetLogged={onSetLogged} />
      </>}
      {!plan && <div className="mt-12 rounded-2xl border border-line/[0.08] bg-surface px-6 py-12 text-center">
        <p className="text-lg font-semibold text-foreground">{isToday ? `Heute ${restText === 'Ruhetag' ? 'ist Ruhetag' : 'ist nichts geplant'}` : `${WEEKDAY_NAMES[weekday]}: ${restText}`}</p>
        <p className="mt-1 text-sm text-muted">Oben kannst du dir die anderen Trainingstage ansehen.</p>
      </div>}
    </>}
  </>
}
