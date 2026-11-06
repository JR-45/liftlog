import { useEffect, useRef, useState } from 'react'
import { type DayData, ensureWorkout, loadDay } from './api'
import { ExerciseCard } from './ExerciseCard'

type Props = { planDayId: string; userId: string; today: string }

export function DayView({ planDayId, userId, today }: Props) {
  const [day, setDay] = useState<DayData | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const workoutId = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDay(planDayId, today)
      .then((data) => {
        if (cancelled) return
        workoutId.current = data.workoutId
        setDay(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [planDayId, today, attempt])

  // Das Workout entsteht erst mit dem ersten gespeicherten Satz. Bloßes Ansehen legt nichts an.
  async function getWorkoutId(): Promise<string> {
    workoutId.current ??= await ensureWorkout(planDayId, today)
    return workoutId.current
  }

  if (failed) {
    return (
      <div className="mt-6">
        <p role="alert" className="text-sm text-red-300">Der Trainingstag konnte nicht geladen werden.</p>
        <button
          className="mt-2 py-2 text-sm text-neutral-200 underline"
          type="button"
          onClick={() => {
            setFailed(false)
            setAttempt((current) => current + 1)
          }}
        >
          Noch einmal versuchen
        </button>
      </div>
    )
  }

  if (day === null) return <p className="mt-6 text-sm text-neutral-400">Übungen werden geladen …</p>

  return (
    <ul className="mt-4 space-y-4">
      {day.entries.map((entry) => (
        <ExerciseCard
          key={entry.id}
          entry={entry}
          userId={userId}
          today={today}
          todaySets={day.todaySets}
          lastSets={day.lastSets}
          getWorkoutId={getWorkoutId}
        />
      ))}
    </ul>
  )
}
