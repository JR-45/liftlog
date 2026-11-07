import { useEffect, useRef, useState } from 'react'
import { countLoggedSets, setKey, type SetValues } from '../../domain/sets'
import { type DayData, ensureWorkout, loadDay, type PlanEntry } from './api'
import { ExerciseCard } from './ExerciseCard'

type SavedSets = Record<string, SetValues>
type Props = { planDayId: string; userId: string; today: string; onSetLogged: () => void }

function entryIds(entry: PlanEntry): string[] {
  return entry.alternative ? [entry.exercise.id, entry.alternative.id] : [entry.exercise.id]
}

function isDone(entry: PlanEntry, saved: SavedSets): boolean {
  return countLoggedSets(saved, entryIds(entry)) >= entry.sets_min
}

/** Nächste offene Übung nach der angegebenen Position, sonst die erste offene überhaupt. */
function nextOpenEntry(entries: PlanEntry[], saved: SavedSets, afterIndex: number): string | null {
  const ordered = [...entries.slice(afterIndex + 1), ...entries.slice(0, afterIndex + 1)]
  return ordered.find((entry) => !isDone(entry, saved))?.id ?? null
}

export function DayView({ planDayId, userId, today, onSetLogged }: Props) {
  const [day, setDay] = useState<DayData | null>(null)
  const [savedSets, setSavedSets] = useState<SavedSets>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [scrollTarget, setScrollTarget] = useState<{ id: string; request: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const workoutId = useRef<string | null>(null)
  // Immer der neueste Stand, auch wenn mehrere Sätze kurz nacheinander gespeichert werden.
  const latestSaved = useRef<SavedSets>({})

  useEffect(() => {
    let cancelled = false
    loadDay(planDayId, today)
      .then((data) => {
        if (cancelled) return
        const saved = Object.fromEntries(data.todaySets.map((set) => [setKey(set.exercise_id, set.set_number), set]))
        workoutId.current = data.workoutId
        latestSaved.current = saved
        setSavedSets(saved)
        setOpenId(nextOpenEntry(data.entries, saved, -1))
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

  function scrollTo(id: string) {
    setScrollTarget((current) => ({ id, request: (current?.request ?? 0) + 1 }))
  }

  function handleToggle(id: string) {
    if (openId === id) {
      setOpenId(null)
    } else {
      setOpenId(id)
      scrollTo(id)
    }
  }

  function handleContinue(index: number) {
    if (!day) return
    const nextId = nextOpenEntry(day.entries, latestSaved.current, index)
    setOpenId(nextId)
    if (nextId) scrollTo(nextId)
  }

  function handleSetChange(exerciseId: string, setNumber: number, values: SetValues | null, autoAdvance: boolean) {
    const previous = latestSaved.current
    const key = setKey(exerciseId, setNumber)
    const next = { ...previous }
    // Beim erneuten Speichern bleibt die Entscheidung fürs nächste Mal erhalten.
    if (values) next[key] = { ...previous[key], ...values }
    else delete next[key]
    latestSaved.current = next
    setSavedSets(next)

    if (!values || !day) return
    const index = day.entries.findIndex((entry) => entryIds(entry).includes(exerciseId))
    const entry = day.entries[index]
    if (!entry) return

    // Ohne Gewicht gibt es nichts mehr zu entscheiden: Mit dem letzten Satz öffnet sich die nächste Übung.
    const ids = entryIds(entry)
    const finishedEntry =
      countLoggedSets(next, ids) >= entry.sets_max && countLoggedSets(previous, ids) < entry.sets_max
    if (finishedEntry && autoAdvance) handleContinue(index)

    // Nur ein neuer Satz startet die Pause, nicht das Korrigieren eines alten. Nach der letzten Übung braucht es keine.
    const trainingDone = day.entries.every((current) => isDone(current, next))
    if (!(key in previous) && !trainingDone) onSetLogged()
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
  const done = day.entries.filter((entry) => isDone(entry, savedSets)).length

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mt-3 bg-neutral-900 px-4 py-2">
        <span className={`text-sm ${done === total ? 'font-medium text-yellow-300' : 'text-neutral-300'}`}>
          {done === total ? 'Training geschafft! 💪' : `${done} von ${total} Übungen`}
        </span>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-800"
          role="progressbar"
          aria-label="Fortschritt im Training"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <div
            className="h-full rounded-full bg-yellow-400 transition-all duration-300"
            style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
          />
        </div>
      </div>

      <ul className="mt-2 space-y-2">
        {day.entries.map((entry, index) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
            userId={userId}
            today={today}
            open={openId === entry.id}
            scrollRequest={scrollTarget?.id === entry.id ? scrollTarget.request : null}
            savedSets={savedSets}
            lastSets={day.lastSets}
            getWorkoutId={getWorkoutId}
            onToggle={() => handleToggle(entry.id)}
            onContinue={() => handleContinue(index)}
            onSetChange={handleSetChange}
          />
        ))}
      </ul>
    </>
  )
}
