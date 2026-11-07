import { useEffect, useState } from 'react'
import { buildWeek, shiftDate, weekStart, type ScheduledDay } from '../../domain/week'
import { loadScheduledDays, loadWeekWorkouts, saveTrainingWeek, type PlanDay, type WeekWorkout } from './api'
import { WeekPlanner } from './WeekPlanner'

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
    <p role="alert" className="text-sm text-danger">Die Woche konnte nicht geladen werden.</p>
    <button className="min-h-11 text-sm font-medium text-accent-ink" type="button" onClick={() => { setFailed(null); setAttempt((value) => value + 1) }}>Erneut versuchen</button>
  </div>
  if (!data) return <p className="mt-6 text-sm text-muted">Woche wird geladen …</p>

  return <>
    <WeekPlanner selectedDate={selectedDate} today={today} days={data.days} planDays={planDays} workouts={data.workouts}
      dirty={dirty} busy={busy} onDate={selectDate}
      onChange={(index, value) => {
        setMessage(null)
        setLoaded({ ...data, days: data.days.map((day, i) => i === index ? {
          ...day, plan_day_id: ['rest', 'unplanned'].includes(value) ? null : value, is_rest_day: value === 'rest',
        } : day) })
      }}
      onSave={() => void save()} onDiscard={() => { setLoaded({ ...data, days: data.original }); setMessage(null) }}
      onTemplate={() => { setLoaded({ ...data, days: buildWeek(start, planDays, []) }); setMessage(null) }} />
    {message && <p role="status" className="mt-2 text-sm text-muted">{message}</p>}
  </>
}
