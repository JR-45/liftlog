import { useEffect, useRef, useState } from 'react'
import { countLoggedSets, setKey, type SetValues } from '../../domain/sets'
import { type DayData, ensureWorkout, loadDay } from './api'
import { ExerciseCard } from './ExerciseCard'

type Props = { planDayId: string; userId: string; today: string }

export function DayView({ planDayId, userId, today }: Props) {
  const [day, setDay] = useState<DayData | null>(null)
  const [savedSets, setSavedSets] = useState<Record<string, SetValues>>({})
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const workoutId = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDay(planDayId, today)
      .then((data) => {
        if (cancelled) return
        workoutId.current = data.workoutId
        setSavedSets(Object.fromEntries(data.todaySets.map((set) => [setKey(set.exercise_id, set.set_number), set])))
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

  function handleSetChange(exerciseId: string, setNumber: number, values: SetValues | null) {
    setSavedSets((current) => {
      const next = { ...current }
      if (values) next[setKey(exerciseId, setNumber)] = values
      else delete next[setKey(exerciseId, setNumber)]
      return next
    })
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

  const total = day.entries.length
  const done = day.entries.filter((entry) => {
    const ids = entry.alternative ? [entry.exercise.id, entry.alternative.id] : [entry.exercise.id]
    return countLoggedSets(savedSets, ids) >= entry.sets_min
  }).length

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mt-3 bg-neutral-900 px-4 py-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className={done === total ? 'font-medium text-emerald-300' : 'text-neutral-300'}>
            {done === total ? 'Training geschafft! 💪' : `${done} von ${total} Übungen`}
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-800"
          role="progressbar"
          aria-label="Fortschritt im Training"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
          />
        </div>
      </div>

      <ul className="mt-2 space-y-3">
        {day.entries.map((entry) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
            userId={userId}
            today={today}
            savedSets={savedSets}
            lastSets={day.lastSets}
            getWorkoutId={getWorkoutId}
            onSetChange={handleSetChange}
          />
        ))}
      </ul>
    </>
  )
}
