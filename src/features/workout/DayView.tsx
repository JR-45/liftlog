import { useEffect, useRef, useState } from 'react'
import { countLoggedSets, setKey, type SetValues } from '../../domain/sets'
import { summarizeWorkout } from '../../domain/summary'
import { TrophyIcon } from '../../lib/icons'
import { trainingSetCount } from '../../domain/planEditing'
import { readSetCount, writeSetCount } from './drafts'
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/useMediaQuery'
import { AddExerciseForm } from './AddExerciseForm'
import { type DayData, ensureWorkout, type Exercise, loadDay, type PlanEntry } from './api'
import { ExerciseCard } from './ExerciseCard'
import { WorkoutSummary } from './WorkoutSummary'

type SavedSets = Record<string, SetValues>
type Props = { planDayId: string; userId: string; today: string; onSetLogged: () => void }

function entryIds(entry: PlanEntry): string[] {
  return entry.alternative ? [entry.exercise.id, entry.alternative.id] : [entry.exercise.id]
}

function isDone(entry: PlanEntry, saved: SavedSets, targets: Record<string, number>): boolean {
  return countLoggedSets(saved, entryIds(entry)) >= (targets[entry.id] ?? 3)
}

/** Nächste offene Übung nach der angegebenen Position, sonst die erste offene überhaupt. */
function nextOpenEntry(entries: PlanEntry[], saved: SavedSets, afterIndex: number, targets: Record<string, number>): string | null {
  const ordered = [...entries.slice(afterIndex + 1), ...entries.slice(0, afterIndex + 1)]
  return ordered.find((entry) => !isDone(entry, saved, targets))?.id ?? null
}

/** Wurde heute schon die Alternative trainiert, startet die Übung direkt mit ihr. */
function initialActiveId(entry: PlanEntry, saved: SavedSets): string {
  const { alternative, exercise } = entry
  const usedAlternative = alternative && countLoggedSets(saved, [alternative.id]) > 0
  const usedMain = countLoggedSets(saved, [exercise.id]) > 0
  return usedAlternative && !usedMain ? alternative.id : exercise.id
}

export function DayView({ planDayId, userId, today, onSetLogged }: Props) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [day, setDay] = useState<DayData | null>(null)
  const [savedSets, setSavedSets] = useState<SavedSets>({})
  const [setCounts, setSetCounts] = useState<Record<string, number>>({})
  // Liegen hier statt in der Karte, damit Liste und Detail am Laptop denselben Stand zeigen.
  const [exercises, setExercises] = useState<Record<string, Exercise>>({})
  const [activeIds, setActiveIds] = useState<Record<string, string>>({})
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
        const all = data.entries.flatMap((entry) => (entry.alternative ? [entry.exercise, entry.alternative] : [entry.exercise]))
        workoutId.current = data.workoutId
        latestSaved.current = saved
        setSavedSets(saved)
        const counts = Object.fromEntries(data.entries.map((entry) => [entry.id, trainingSetCount(
          readSetCount(userId, today, entry.id),
          data.todaySets.filter((set) => entryIds(entry).includes(set.exercise_id)).map((set) => set.set_number),
        )]))
        setSetCounts(counts)
        setExercises(Object.fromEntries(all.map((exercise) => [exercise.id, exercise])))
        setActiveIds(Object.fromEntries(data.entries.map((entry) => [entry.id, initialActiveId(entry, saved)])))
        setOpenId(nextOpenEntry(data.entries, saved, -1, counts))
        setDay(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [planDayId, userId, today, attempt])

  // Das Workout entsteht erst mit dem ersten gespeicherten Satz. Bloßes Ansehen legt nichts an.
  async function getWorkoutId(): Promise<string> {
    workoutId.current ??= await ensureWorkout(planDayId, today)
    return workoutId.current
  }

  function scrollTo(id: string) {
    setScrollTarget((current) => ({ id, request: (current?.request ?? 0) + 1 }))
  }

  function handleToggle(id: string) {
    // Am Laptop ist immer eine Übung rechts offen. Ein Klick wählt sie nur aus.
    if (isDesktop) {
      setOpenId(id)
    } else if (openId === id) {
      setOpenId(null)
    } else {
      setOpenId(id)
      scrollTo(id)
    }
  }

  function handleExerciseChange(exerciseId: string, changes: Partial<Exercise>) {
    setExercises((current) => ({ ...current, [exerciseId]: { ...current[exerciseId], ...changes } }))
  }

  function handleSetChange(exerciseId: string, setNumber: number, values: SetValues | null) {
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

    // Mit dem letzten Satz öffnet sich die nächste Übung. Die fertige bleibt oben im Bild,
    // damit die Frage „Geschafft?“ direkt zu sehen ist.
    const ids = entryIds(entry)
    const finishedEntry =
      countLoggedSets(next, ids) >= (setCounts[entry.id] ?? 3) && countLoggedSets(previous, ids) < (setCounts[entry.id] ?? 3)
    if (finishedEntry) {
      setOpenId(nextOpenEntry(day.entries, next, index, setCounts))
      scrollTo(entry.id)
    }

    // Nur ein neuer Satz startet die Pause, nicht das Korrigieren eines alten. Nach der letzten Übung braucht es keine.
    const trainingDone = day.entries.every((current) => isDone(current, next, setCounts))
    if (!(key in previous) && !trainingDone) onSetLogged()
  }

  if (failed) {
    return (
      <div className="mt-6 rounded-2xl border border-line/[0.08] bg-surface p-4">
        <p role="alert" className="text-sm text-danger">Der Trainingstag konnte nicht geladen werden.</p>
        <button
          className="mt-2 min-h-11 py-2 text-sm font-medium text-accent-ink"
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

  if (day === null) return <p className="mt-6 text-sm text-muted">Übungen werden geladen …</p>

  const total = day.entries.length
  const done = day.entries.filter((entry) => isDone(entry, savedSets, setCounts)).length
  const openEntry = day.entries.find((entry) => entry.id === openId)
  const finished = total > 0 && done === total

  const summary = summarizeWorkout({
    exercises: day.entries.map((entry) => {
      const id = activeIds[entry.id] ?? entry.exercise.id
      const ex = exercises[id] ?? entry.exercise
      return {
        id: ex.id,
        name: ex.name,
        tracking_type: ex.tracking_type,
        unit: entry.duration_min === null ? ('minutes' as const) : ('seconds' as const),
      }
    }),
    todaySets: Object.entries(savedSets).map(([key, values]) => {
      const [exercise_id, num] = key.split(':')
      return { ...values, exercise_id, set_number: Number(num) }
    }),
    lastSets: day.lastSets,
  })

  function handleEntryAdded(entry: PlanEntry) {
    const count = trainingSetCount(entry.sets_max, [])
    setSetCounts((current) => ({ ...current, [entry.id]: count }))
    writeSetCount(userId, today, entry.id, count)
    setExercises((current) => ({ ...current, [entry.exercise.id]: entry.exercise }))
    setActiveIds((current) => ({ ...current, [entry.id]: entry.exercise.id }))
    setDay((current) => (current ? { ...current, entries: [...current.entries, entry] } : current))
    setOpenId(entry.id)
  }

  function handleEntryRemoved(entryId: string) {
    setDay((current) => (current ? { ...current, entries: current.entries.filter((e) => e.id !== entryId) } : current))
    if (openId === entryId) setOpenId(null)
  }

  function handleEntryChange(entryId: string, changes: Pick<PlanEntry, 'sets_min' | 'sets_max'>) {
    setDay((current) =>
      current
        ? {
            ...current,
            entries: current.entries.map((entry) => (entry.id === entryId ? { ...entry, ...changes } : entry)),
          }
        : current,
    )
  }

  function handleSetDeleted(exerciseId: string, deletedSetNumber: number) {
    const previous = latestSaved.current
    const next: SavedSets = {}
    for (const [key, values] of Object.entries(previous)) {
      const [id, numStr] = key.split(':')
      const num = Number(numStr)
      if (id !== exerciseId || num < deletedSetNumber) {
        next[key] = values
      } else if (num > deletedSetNumber) {
        next[setKey(id, num - 1)] = values
      }
    }
    latestSaved.current = next
    setSavedSets(next)
  }

  const nextPos = day.entries.reduce((max, e) => Math.max(max, e.position), 0) + 1

  function card(entry: PlanEntry, layout: 'stacked' | 'summary' | 'detail') {
    return (
      <ExerciseCard
        key={entry.id}
        entry={entry}
        layout={layout}
        exercises={exercises}
        activeId={activeIds[entry.id]}
        userId={userId}
        today={today}
        open={openId === entry.id}
        scrollRequest={layout === 'stacked' && scrollTarget?.id === entry.id ? scrollTarget.request : null}
        savedSets={savedSets}
        setCount={setCounts[entry.id] ?? 3}
        onSetCountChange={(count) => {
          setSetCounts((current) => ({ ...current, [entry.id]: count }))
          writeSetCount(userId, today, entry.id, count)
        }}
        lastSets={day?.lastSets ?? []}
        getWorkoutId={getWorkoutId}
        onToggle={() => handleToggle(entry.id)}
        onSetChange={handleSetChange}
        onExerciseChange={handleExerciseChange}
        onActiveChange={(exerciseId) => setActiveIds((current) => ({ ...current, [entry.id]: exerciseId }))}
        onRemoveEntry={total > 1 ? () => handleEntryRemoved(entry.id) : undefined}
        onEntryChange={(changes) => handleEntryChange(entry.id, changes)}
        onSetDeleted={handleSetDeleted}
      />
    )
  }

  const progress = (
    <div className="apple-glass sticky top-0 z-10 -mx-4 mt-2 border-b border-line/[0.06] px-4 py-2.5 md:-mx-6 md:px-6 lg:mx-0 lg:rounded-2xl lg:border lg:bg-surface lg:px-4">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${
            done === total ? 'text-success' : 'text-muted'
          }`}
        >
          {done === total ? (
            <>
              Training geschafft!
              <TrophyIcon className="h-4 w-4 shrink-0" />
            </>
          ) : (
            `${done} von ${total} Übungen`
          )}
        </span>
        <span className="text-xs font-semibold tabular-nums text-muted">
          {total === 0 ? '0%' : `${Math.round((done / total) * 100)}%`}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-control"
        role="progressbar"
        aria-label="Fortschritt im Training"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            done === total ? 'bg-success' : 'bg-accent'
          }`}
          style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
        />
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <div className="mt-3 grid grid-cols-[minmax(0,21rem)_minmax(0,40rem)] items-start gap-6">
        <div>
          {progress}
          <ul className="mt-3 space-y-2.5">{day.entries.map((entry) => card(entry, 'summary'))}</ul>
          <AddExerciseForm planDayId={planDayId} nextPosition={nextPos} onAdded={handleEntryAdded} />
        </div>
        <div className="sticky top-4 space-y-4">
          {openEntry ? (
            card(openEntry, 'detail')
          ) : !finished ? (
            <div className="rounded-2xl border border-line/[0.08] bg-surface px-6 py-16 text-center">
              <p className="inline-flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
                Wähle links eine Übung
              </p>
            </div>
          ) : null}
          <WorkoutSummary summary={summary} finished={finished} />
        </div>
      </div>
    )
  }

  return (
    <>
      {progress}
      <ul className="mt-3 space-y-2.5">{day.entries.map((entry) => card(entry, 'stacked'))}</ul>
      {summary.totalSets > 0 && (
        <div className="mt-4">
          <WorkoutSummary summary={summary} finished={finished} />
        </div>
      )}
      <AddExerciseForm planDayId={planDayId} nextPosition={nextPos} onAdded={handleEntryAdded} />
    </>
  )
}
