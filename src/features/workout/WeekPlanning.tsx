import { useEffect, useState } from 'react'
import { buildWeek, shiftDate, weekStart, type ScheduledDay } from '../../domain/week'
import { loadScheduledDays, loadWeekWorkouts, saveTrainingWeek, type PlanDay, type WeekWorkout } from './api'
import { WeekPlanner } from './WeekPlanner'
import { WorkoutHistory } from './WorkoutHistory'

const DATE = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
type LoadedWeek = { start: string; days: ScheduledDay[]; original: ScheduledDay[]; workouts: WeekWorkout[] }

export function WeekPlanning({ today, planDays, active }: {
  today: string; planDays: PlanDay[]; active: boolean
}) {
  const [selectedDate, setSelectedDate] = useState(today)
  const [loaded, setLoaded] = useState<LoadedWeek | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const start = weekStart(selectedDate)
  const data = loaded?.start === start ? loaded : null
  const dirty = data !== null && JSON.stringify(data.days) !== JSON.stringify(data.original)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadScheduledDays(start, shiftDate(start, 6)), loadWeekWorkouts(start, shiftDate(start, 6))])
      .then(([overrides, workouts]) => {
        if (cancelled) return
        const days = buildWeek(start, planDays, overrides)
        setLoaded({ start, days, original: days, workouts })
      }).catch(() => { if (!cancelled) setFailed(start) })
    return () => { cancelled = true }
  }, [start, planDays, attempt])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    void loadWeekWorkouts(start, shiftDate(start, 6)).then((workouts) => {
      if (!cancelled) setLoaded((current) => current?.start === start ? { ...current, workouts } : current)
    }).catch(() => { /* Die nächste Wochenabfrage lädt die Markierungen erneut. */ })
    return () => { cancelled = true }
  }, [active, start])

  function selectDate(date: string) {
    if (busy || (dirty && weekStart(date) !== start)) return
    setSelectedDate(date)
    setHistoryId(null)
    setMessage(null)
  }

  async function save() {
    if (!data || busy) return
    setBusy(true)
    setMessage(null)
    try {
      await saveTrainingWeek(start, data.days)
      setLoaded({ ...data, original: data.days })
      setMessage('Woche gespeichert.')
    } catch {
      setMessage('Die Woche konnte nicht gespeichert werden. Deine Änderungen bleiben erhalten. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  if (failed === start) return <div className="mt-6">
    <p role="alert" className="text-red-300">Die Woche konnte nicht geladen werden.</p>
    <button className="min-h-11 underline" type="button" onClick={() => { setFailed(null); setAttempt((value) => value + 1) }}>Erneut versuchen</button>
  </div>
  if (!data) return <p className="mt-6 text-neutral-400">Woche wird geladen …</p>
  const assignment = data.days.find((day) => day.day_date === selectedDate)!
  const plan = planDays.find((item) => item.id === assignment.plan_day_id)
  const existing = data.workouts.filter((workout) => workout.performed_on === selectedDate)

  return <>
    <WeekPlanner selectedDate={selectedDate} today={today} days={data.days} planDays={planDays} workouts={data.workouts}
      editable={true} dirty={dirty} busy={busy} onDate={selectDate}
      onChange={(index, value) => {
        setMessage(null)
        setLoaded({ ...data, days: data.days.map((day, i) => i === index ? {
          ...day, plan_day_id: ['rest', 'unplanned'].includes(value) ? null : value, is_rest_day: value === 'rest',
        } : day) })
      }}
      onSave={() => void save()} onDiscard={() => { setLoaded({ ...data, days: data.original }); setMessage(null) }}
      onTemplate={() => { setLoaded({ ...data, days: buildWeek(start, planDays, []) }); setMessage(null) }} />
    {message && <p role="status" className="mt-3 text-sm text-neutral-300">{message}</p>}
    <section className="mt-6" aria-label="Ausgewählter Tag">
      <h3 className="text-lg font-medium">{DATE.format(new Date(`${selectedDate}T12:00:00`))}</h3>
      <p className="mt-2 text-sm text-neutral-400">{plan ? `${plan.name} ist eingeplant.` : assignment.is_rest_day ? 'Du hast hier einen Ruhetag eingeplant.' : 'Für diesen Tag ist noch kein Training geplant.'} Die Zuordnung gilt nur für diese Woche.</p>
      {existing.length > 0 && <div className="mt-5 rounded-xl border border-neutral-700 p-3">
        <h4 className="font-medium">Vorhandene Trainingsdaten</h4>
        <p className="mt-1 text-sm text-neutral-400">Deine gespeicherten Sätze bleiben auch beim Umplanen erhalten.</p>
        <div className="mt-3 flex flex-wrap gap-2">{existing.map((workout) => <button key={workout.id} type="button"
          className="min-h-11 rounded-lg bg-neutral-800 px-3 py-2 text-sm" aria-pressed={historyId === workout.id}
          onClick={() => setHistoryId(historyId === workout.id ? null : workout.id)}>{workout.name} ansehen</button>)}</div>
        {historyId && existing.some((workout) => workout.id === historyId) && <WorkoutHistory key={historyId} workoutId={historyId} />}
      </div>}
    </section>
  </>
}
