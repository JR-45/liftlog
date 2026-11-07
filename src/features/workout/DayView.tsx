import { useEffect, useRef, useState } from 'react'
import { dayProgress } from '../../domain/dayProgress'
import { countLoggedSets, setKey, type SetValues } from '../../domain/sets'
import { summarizeWorkout } from '../../domain/summary'
import { estimateMinutes, formatElapsed } from '../../domain/motivation'
import { StopwatchIcon, TrophyIcon } from '../../lib/icons'
import { trainingSetCount } from '../../domain/planEditing'
import { readSkippedEntries, writeSkippedEntries } from './drafts'
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/useMediaQuery'
import {
  type DayData,
  ensureWorkout,
  type Exercise,
  loadDay,
  type PlanEntry,
  resetWorkoutClock,
  restartWorkoutClock,
  setWorkoutFinished,
} from './api'
import { ExerciseCard } from './ExerciseCard'
import { WorkoutSummary } from './WorkoutSummary'

type SavedSets = Record<string, SetValues>
type Props = {
  planDayId: string
  userId: string
  today: string
  /** Name des Trainingstags, z. B. „Oberkörper“. */
  dayName: string
  /** Ob der gezeigte Tag heute ist. Sonst steht der Wochentag in der Karte. */
  dayLabel: string
  restSeconds: number
  onSetLogged: () => void
}

function entryIds(entry: PlanEntry): string[] {
  return entry.alternative ? [entry.exercise.id, entry.alternative.id] : [entry.exercise.id]
}

function isDone(entry: PlanEntry, saved: SavedSets): boolean {
  return countLoggedSets(saved, entryIds(entry)) >= entry.sets_min
}

/** Die Satzanzahl kommt aus dem Plan. Heute schon mehr gespeicherte Sätze bleiben sichtbar. */
function setCountFor(entry: PlanEntry, saved: SavedSets): number {
  const ids = entryIds(entry)
  const numbers = Object.keys(saved).flatMap((key) => {
    const [id, setNumber] = key.split(':')
    return ids.includes(id) ? [Number(setNumber)] : []
  })
  return trainingSetCount(entry.sets_max, numbers)
}

/** Nächste offene Übung nach der angegebenen Position, sonst die erste offene überhaupt. */
function nextOpenEntry(
  entries: PlanEntry[],
  saved: SavedSets,
  afterIndex: number,
  skipped: ReadonlySet<string>,
): string | null {
  const ordered = [...entries.slice(afterIndex + 1), ...entries.slice(0, afterIndex + 1)]
  return ordered.find((entry) => !isDone(entry, saved) && !skipped.has(entry.id))?.id ?? null
}

/** Wurde heute schon die Alternative trainiert, startet die Übung direkt mit ihr. */
function initialActiveId(entry: PlanEntry, saved: SavedSets): string {
  const { alternative, exercise } = entry
  const usedAlternative = alternative && countLoggedSets(saved, [alternative.id]) > 0
  const usedMain = countLoggedSets(saved, [exercise.id]) > 0
  return usedAlternative && !usedMain ? alternative.id : exercise.id
}

export function DayView({ planDayId, userId, today, dayName, dayLabel, restSeconds, onSetLogged }: Props) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [day, setDay] = useState<DayData | null>(null)
  const [savedSets, setSavedSets] = useState<SavedSets>({})
  // Liegen hier statt in der Karte, damit Liste und Detail am Laptop denselben Stand zeigen.
  const [exercises, setExercises] = useState<Record<string, Exercise>>({})
  const [activeIds, setActiveIds] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set())
  const [scrollTarget, setScrollTarget] = useState<{ id: string; request: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const workoutId = useRef<string | null>(null)
  // Immer der neueste Stand, auch wenn mehrere Sätze kurz nacheinander gespeichert werden.
  const latestSaved = useRef<SavedSets>({})
  // Stoppuhr: Start ist die Anlage des Workouts, Ende der Abschluss. Beides liegt in der Datenbank.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (startedAt === null || finishedAt !== null) return
    const tick = () => setNow(Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt, finishedAt])

  useEffect(() => {
    let cancelled = false
    loadDay(planDayId, today)
      .then((data) => {
        if (cancelled) return
        const saved = Object.fromEntries(data.todaySets.map((set) => [setKey(set.exercise_id, set.set_number), set]))
        const all = data.entries.flatMap((entry) => (entry.alternative ? [entry.exercise, entry.alternative] : [entry.exercise]))
        workoutId.current = data.workoutId
        // Ende gleich Start heißt: Die Uhr wurde zurückgesetzt und steht auf 0:00.
        const wasReset = data.workoutStartedAt !== null && data.workoutStartedAt === data.workoutFinishedAt
        setStartedAt(data.workoutStartedAt && !wasReset ? Date.parse(data.workoutStartedAt) : null)
        setFinishedAt(data.workoutFinishedAt && !wasReset ? Date.parse(data.workoutFinishedAt) : null)
        latestSaved.current = saved
        setSavedSets(saved)
        setExercises(Object.fromEntries(all.map((exercise) => [exercise.id, exercise])))
        setActiveIds(Object.fromEntries(data.entries.map((entry) => [entry.id, initialActiveId(entry, saved)])))
        const skippedToday = readSkippedEntries(userId, today)
        setSkipped(skippedToday)
        setOpenId(nextOpenEntry(data.entries, saved, -1, skippedToday))
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
    if (workoutId.current === null) {
      const workout = await ensureWorkout(planDayId, today)
      workoutId.current = workout.id
      setStartedAt((current) => current ?? Date.parse(workout.startedAt))
    }
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

  /** Sind alle Übungen erledigt oder übersprungen, stoppt die Stoppuhr von selbst. */
  function stopIfDone(saved: SavedSets, skippedNow: ReadonlySet<string>) {
    if (!day || finishedAt !== null || workoutId.current === null) return
    if (!day.entries.every((entry) => isDone(entry, saved) || skippedNow.has(entry.id))) return
    const end = Date.now()
    setFinishedAt(end)
    setWorkoutFinished(workoutId.current, new Date(end).toISOString()).catch(() => setFinishedAt(null))
  }

  function handleSkipChange(entryId: string, skip: boolean) {
    if (!day) return
    const next = new Set(skipped)
    if (skip) next.add(entryId)
    else next.delete(entryId)
    setSkipped(next)
    writeSkippedEntries(userId, today, next)
    stopIfDone(latestSaved.current, next)
    if (skip && openId === entryId) {
      const index = day.entries.findIndex((entry) => entry.id === entryId)
      const nextId = nextOpenEntry(day.entries, latestSaved.current, index, next)
      setOpenId(nextId)
      if (nextId) scrollTo(nextId)
    }
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

    // Wer eine übersprungene Übung doch trainiert, hat sie nicht mehr übersprungen.
    let nowSkipped = skipped
    if (skipped.has(entry.id)) {
      const without = new Set(skipped)
      without.delete(entry.id)
      nowSkipped = without
      setSkipped(without)
      writeSkippedEntries(userId, today, without)
    }

    // Mit dem letzten Satz öffnet sich die nächste Übung. Die fertige bleibt oben im Bild,
    // damit die Frage „Geschafft?“ direkt zu sehen ist.
    const ids = entryIds(entry)
    const finishedEntry =
      countLoggedSets(next, ids) >= entry.sets_max && countLoggedSets(previous, ids) < entry.sets_max
    if (finishedEntry) {
      setOpenId(nextOpenEntry(day.entries, next, index, nowSkipped))
      scrollTo(entry.id)
    }

    // Nur ein neuer Satz startet die Pause, nicht das Korrigieren eines alten. Nach der letzten Übung braucht es keine.
    const trainingDone = day.entries.every((current) => isDone(current, next) || nowSkipped.has(current.id))
    if (!(key in previous) && !trainingDone) onSetLogged()
    if (trainingDone) stopIfDone(next, nowSkipped)
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

  const { done, total, finished } = dayProgress(
    day.entries.map((entry) => ({ done: isDone(entry, savedSets), skipped: skipped.has(entry.id) })),
  )
  const openEntry = day.entries.find((entry) => entry.id === openId)

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
        setCount={setCountFor(entry, savedSets)}
        lastSets={day?.lastSets ?? []}
        getWorkoutId={getWorkoutId}
        onToggle={() => handleToggle(entry.id)}
        onSetChange={handleSetChange}
        onExerciseChange={handleExerciseChange}
        onActiveChange={(exerciseId) => setActiveIds((current) => ({ ...current, [entry.id]: exerciseId }))}
        skipped={skipped.has(entry.id)}
        onSkipChange={(skip) => handleSkipChange(entry.id, skip)}
      />
    )
  }

  const nextId = finished ? null : nextOpenEntry(day.entries, savedSets, -1, skipped)
  const plannedSets = day.entries
    .filter((entry) => !skipped.has(entry.id))
    .reduce((sum, entry) => sum + setCountFor(entry, savedSets), 0)

  /**
   * Öffnet die nächste offene Übung, scrollt zu ihr und lässt sie kurz aufleuchten.
   * Meist ist sie schon offen, ohne Scrollen und Leuchten passiert dann scheinbar nichts.
   */
  async function handleStart() {
    if (workoutId.current !== null && startedAt === null) {
      // Das Workout gibt es schon (zurückgesetzte Uhr oder nur Sätze): Die Uhr startet jetzt neu.
      const start = Date.now()
      setStartedAt(start)
      setFinishedAt(null)
      restartWorkoutClock(workoutId.current, new Date(start).toISOString()).catch(() => setStartedAt(null))
    } else {
      // Legt das Workout an und startet damit die Stoppuhr. Scheitert das, startet sie mit dem ersten Satz.
      getWorkoutId().catch(() => {})
    }
    if (!nextId) return
    setOpenId(nextId)
    // Erst nach dem Aufklappen scrollen, sonst verschiebt die Animation das Ziel.
    setTimeout(() => {
      const target = [...document.querySelectorAll<HTMLElement>(`[data-entry="${nextId}"]`)].find(
        (element) => element.offsetParent !== null,
      )
      if (!target) return
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
      target.classList.remove('start-pulse')
      void target.offsetWidth // Startet die Animation auch beim zweiten Klick neu.
      target.classList.add('start-pulse')
    }, 320)
  }

  async function handleStop() {
    if (workoutId.current === null || finishedAt !== null) return
    const end = Date.now()
    setFinishedAt(end)
    try {
      await setWorkoutFinished(workoutId.current, new Date(end).toISOString())
    } catch {
      setFinishedAt(null)
    }
  }

  /** Nimmt ein versehentliches „Beenden“ zurück. Die Uhr läuft ab dem ursprünglichen Start weiter. */
  async function handleResume() {
    if (workoutId.current === null || finishedAt === null) return
    const previous = finishedAt
    setFinishedAt(null)
    try {
      await setWorkoutFinished(workoutId.current, null)
    } catch {
      setFinishedAt(previous)
    }
  }

  /** Erster Tipp fragt nach, der zweite setzt die Uhr auf 0:00. Die Sätze bleiben. */
  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
      return
    }
    setConfirmReset(false)
    if (workoutId.current === null || startedAt === null) return
    const previous = { startedAt, finishedAt }
    setStartedAt(null)
    setFinishedAt(null)
    try {
      await resetWorkoutClock(workoutId.current)
    } catch {
      setStartedAt(previous.startedAt)
      setFinishedAt(previous.finishedAt)
    }
  }

  const running = startedAt !== null && finishedAt === null
  const elapsed = startedAt === null ? 0 : (finishedAt ?? now) - startedAt
  // Große Stoppuhr rechts oben in der Karte.
  const stopwatch = (
    <div className="shrink-0 text-right" role="timer" aria-label={`Trainingsdauer ${formatElapsed(elapsed)}`}>
      <p
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ${
          running ? 'text-neon' : 'text-muted'
        }`}
      >
        <StopwatchIcon className="h-3.5 w-3.5" />
        {running ? 'Läuft' : finishedAt !== null ? 'Dauer' : 'Stoppuhr'}
      </p>
      <p
        className={`mt-1 font-display text-5xl font-extrabold tabular-nums leading-none lg:text-6xl ${
          running ? 'text-foreground' : finishedAt !== null ? 'text-success' : 'text-muted/60'
        }`}
      >
        {formatElapsed(elapsed)}
      </p>
      {startedAt !== null && (
        <button
          type="button"
          onClick={() => void handleReset()}
          className={`mt-1 min-h-8 text-xs font-semibold uppercase tracking-wider underline underline-offset-2 ${
            confirmReset ? 'text-danger' : 'text-muted'
          }`}
        >
          {confirmReset ? 'Sicher? Nochmal tippen' : 'Zurücksetzen'}
        </button>
      )}
    </div>
  )

  const ended = finishedAt !== null
  const hero = (
    <section className="hero-card relative mt-4 overflow-hidden rounded-3xl border border-neon/30 bg-surface p-5 lg:max-w-[62.5rem] lg:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neon">{dayLabel}</p>
          <h2 className="mt-1 text-4xl text-foreground [overflow-wrap:break-word] lg:text-5xl">{dayName}</h2>
        </div>
        {stopwatch}
      </div>
      <p className="mt-1.5 text-sm font-medium text-muted">
        {total} Übungen · {plannedSets} Sätze · ca. {estimateMinutes(plannedSets, restSeconds)} Min.
      </p>
      <div className="mt-4">
        {finished ? (
          <p className="inline-flex min-h-14 items-center gap-2 font-display text-2xl font-extrabold uppercase text-success">
            <TrophyIcon className="h-6 w-6" /> Training geschafft
          </p>
        ) : ended ? (
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-3">
            <p className="font-display text-2xl font-extrabold uppercase text-foreground">Training beendet</p>
            <button type="button" onClick={() => void handleResume()} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-neon underline">
              Fortsetzen
            </button>
          </div>
        ) : running ? (
          // Derselbe Button stoppt das Training, sobald die Uhr läuft.
          <button
            type="button"
            onClick={() => void handleStop()}
            className="min-h-14 w-full rounded-2xl bg-danger-fill px-4 font-display text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_6px_24px_-6px_var(--color-danger-fill)] active:scale-[0.98] lg:w-auto lg:px-10"
          >
            ■ Training beenden
          </button>
        ) : (
          <button type="button" onClick={() => void handleStart()} className="bg-neon min-h-14 w-full rounded-2xl px-4 text-black lg:w-auto lg:px-10">
            ▶ Training starten
          </button>
        )}
      </div>
    </section>
  )

  const progress = (
    <div className="apple-glass sticky top-0 z-10 -mx-4 mt-2 border-b border-line/[0.06] px-4 py-2.5 md:-mx-6 md:px-6 lg:mx-0 lg:rounded-2xl lg:border lg:bg-surface lg:px-4">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${
            finished ? 'text-success' : 'text-muted'
          }`}
        >
          {finished ? (
            <>
              Training geschafft!
              <TrophyIcon className="h-4 w-4 shrink-0" />
            </>
          ) : (
            <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-wide text-foreground">
              {done}
              <span className="text-muted">/{total}</span>
              <span className="ml-1.5 text-base text-muted">Übungen</span>
            </span>
          )}
        </span>
        <span className="text-xs font-semibold tabular-nums text-muted">
          {total === 0 ? '0%' : `${Math.round((done / total) * 100)}%`}
        </span>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-control"
        role="progressbar"
        aria-label="Fortschritt im Training"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            finished ? 'bg-success' : 'neon-bar bg-neon'
          }`}
          style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
        />
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <>
      {hero}
      <div className="mt-4 grid grid-cols-[minmax(0,21rem)_minmax(0,40rem)] items-start gap-6">
        <div>
          {progress}
          <ul className="mt-3 space-y-2.5">{day.entries.map((entry) => card(entry, 'summary'))}</ul>
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
      </>
    )
  }

  return (
    <>
      {hero}
      {progress}
      <ul className="mt-3 space-y-2.5">{day.entries.map((entry) => card(entry, 'stacked'))}</ul>
      {summary.totalSets > 0 && (
        <div className="mt-4">
          <WorkoutSummary summary={summary} finished={finished} />
        </div>
      )}
    </>
  )
}
