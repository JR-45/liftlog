import { useEffect, useRef, useState } from 'react'
import { progressionHint } from '../../domain/progression'
import {
  type DurationUnit,
  formatPerformance,
  formatPlanned,
  formatRange,
  formatWeight,
  parseWeightStep,
  plannedWeight,
  setKey,
  type SetValues,
  stepWeight,
  type TrackingType,
  usesWeight,
} from '../../domain/sets'
import { deleteSet, type Exercise, type LoggedSet, type PlanEntry, saveSet, updateExercise, updateNextWeights } from './api'
import { readDraft } from './drafts'
import { SetRow } from './SetRow'

const fieldClass =
  'h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-base text-neutral-100 outline-none focus:border-yellow-400 disabled:opacity-50'
const OPEN_ANIMATION_MS = 300

/**
 * stacked: Handy und Tablet, Karte mit Aufklappen.
 * summary: Laptop, kompakter Eintrag in der Liste links.
 * detail: Laptop, die geöffnete Übung rechts, immer offen.
 */
export type CardLayout = 'stacked' | 'summary' | 'detail'

type Props = {
  entry: PlanEntry
  layout: CardLayout
  /** Alle Übungen des Tages. Liegt in DayView, damit Liste und Detail denselben Stand zeigen. */
  exercises: Record<string, Exercise>
  /** Übung oder Alternative, die gerade trainiert wird. */
  activeId: string
  userId: string
  today: string
  open: boolean
  /** Ändert sich der Wert, scrollt die Karte an den oberen Rand. */
  scrollRequest: number | null
  savedSets: Record<string, SetValues>
  lastSets: LoggedSet[]
  getWorkoutId: () => Promise<string>
  onToggle: () => void
  onSetChange: (exerciseId: string, setNumber: number, values: SetValues | null) => void
  onExerciseChange: (exerciseId: string, changes: Partial<Exercise>) => void
  onActiveChange: (exerciseId: string) => void
}

export function ExerciseCard(props: Props) {
  const {
    entry,
    layout,
    exercises,
    activeId,
    userId,
    today,
    open,
    scrollRequest,
    savedSets,
    lastSets,
    getWorkoutId,
    onToggle,
    onSetChange,
    onExerciseChange,
    onActiveChange,
  } = props
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // null: Das Feld zeigt den gespeicherten Wert, sonst die laufende Eingabe.
  const [stepText, setStepText] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [resetRequest, setResetRequest] = useState(0)
  const cardRef = useRef<HTMLLIElement>(null)

  // Erst nach der Animation scrollen, sonst verschiebt die sich schließende Karte das Ziel.
  useEffect(() => {
    if (scrollRequest === null) return
    const timeout = setTimeout(() => {
      cardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, OPEN_ANIMATION_MS)
    return () => clearTimeout(timeout)
  }, [scrollRequest])

  const exercise = exercises[activeId]
  const weighted = usesWeight(exercise.tracking_type)
  const assisted = exercise.tracking_type === 'assisted_reps'
  const unit: DurationUnit = entry.duration_min === null ? 'minutes' : 'seconds'
  const isRounds = entry.sets_min !== entry.sets_max
  const reps = formatRange(entry.reps_min, entry.reps_max)
  const duration = formatRange(entry.duration_min, entry.duration_max)
  const sets = formatRange(entry.sets_min, entry.sets_max)
  const target = reps
    ? `${sets}${isRounds ? ' Runden' : ''} × ${reps}`
    : duration
      ? `${sets} × ${duration} Sek.`
      : 'Dauer frei'
  const last = lastSets.filter((set) => set.exercise_id === activeId)
  const hint = progressionHint({
    tracking: exercise.tracking_type,
    currentWeight: exercise.current_weight_kg,
    setsMin: entry.sets_min,
    repsMin: entry.reps_min,
    repsMax: entry.reps_max,
    lastSets: last,
  })
  const hintText = hint === 'increase_weight' ? 'Gewicht erhöhen empfohlen' : 'Gewichtshilfe senken empfohlen'

  const rows = Array.from({ length: entry.sets_max }, (_, index) => index + 1)
  const logged = rows.flatMap((setNumber) => {
    const set = savedSets[setKey(activeId, setNumber)]
    return set ? [set] : []
  })
  const done = logged.length >= entry.sets_min
  const direction = assisted ? -1 : 1
  const answered = logged.length > 0 && logged.every((set) => set.next_weight_kg != null)
  // Empfehlung: Dieselbe Regel wie beim Hinweis, nur mit den heutigen Sätzen.
  const recommended =
    done &&
    progressionHint({
      tracking: exercise.tracking_type,
      currentWeight: null,
      setsMin: entry.sets_min,
      repsMin: entry.reps_min,
      repsMax: entry.reps_max,
      lastSets: logged.map((set) => ({ ...set, next_weight_kg: null })),
    }) !== null
  const yesSets = logged.map((set) => ({
    ...set,
    next_weight_kg: set.weight_kg === null ? null : stepWeight(set.weight_kg, exercise.weight_step_kg, direction),
  }))
  const yesPlanned = formatPlanned(yesSets)
  const sameWeight = new Set(logged.map((set) => set.weight_kg)).size === 1
  const stepLabel = `${assisted ? '−' : '+'}${formatWeight(exercise.weight_step_kg)}`
  const yesLabel = sameWeight ? `Ja, ${assisted ? 'Hilfe auf' : 'auf'} ${yesPlanned}` : `Ja, ${stepLabel}`
  const noLabel = assisted ? 'Nein, Hilfe lassen' : 'Nein, Gewicht lassen'

  const isDetail = layout === 'detail'
  // Die Sätze sind im Detail immer sichtbar, in der Laptop-Liste nie.
  const bodyVisible = isDetail || (layout === 'stacked' && open)
  // Die Frage steht in der Liste nur, solange die Übung nicht rechts im Detail offen ist.
  const showAnswer = done && weighted && !(layout === 'summary' && open)
  const showSettingsButton = isDetail || (layout === 'stacked' && open)

  /** Speichert „Geschafft?“ für alle gespeicherten Sätze der Übung. */
  async function applyAnswer(nextFor: (set: SetValues) => number | null) {
    setBusy(true)
    setError(null)
    try {
      const updates = rows.flatMap((setNumber) => {
        const set = savedSets[setKey(activeId, setNumber)]
        return set ? [{ setNumber, set, nextWeight: nextFor(set) }] : []
      })
      await updateNextWeights(await getWorkoutId(), activeId, updates)
      for (const { setNumber, set, nextWeight } of updates) {
        onSetChange(activeId, setNumber, { ...set, next_weight_kg: nextWeight })
      }
      // Das Arbeitsgewicht folgt dem schwersten Satz der Entscheidung.
      const planned = updates.flatMap(({ set, nextWeight }) => {
        const value = nextWeight ?? set.weight_kg
        return value === null ? [] : [value]
      })
      if (planned.length > 0) {
        const heaviest = assisted ? Math.min(...planned) : Math.max(...planned)
        await updateExercise(activeId, { current_weight_kg: heaviest })
        onExerciseChange(activeId, { current_weight_kg: heaviest })
      }
    } catch {
      setError('Deine Antwort wurde nicht gespeichert. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  /** Speichert zuerst und ändert die Anzeige nur bei Erfolg. */
  async function applyExerciseChange(
    changes: Partial<Pick<Exercise, 'current_weight_kg' | 'tracking_type' | 'weight_step_kg'>>,
  ) {
    setBusy(true)
    setError(null)
    try {
      await updateExercise(activeId, changes)
      onExerciseChange(activeId, changes)
    } catch {
      setError('Die Änderung wurde nicht gespeichert. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  function handleTrackingChange(next: TrackingType) {
    // Hilfe und Gewicht bedeuten Gegenteiliges: 30 kg Hilfe dürfen nicht zu 30 kg Zusatzgewicht werden.
    const assistChanged = assisted !== (next === 'assisted_reps')
    if (assistChanged) setResetRequest((current) => current + 1)
    void applyExerciseChange(assistChanged ? { tracking_type: next, current_weight_kg: null } : { tracking_type: next })
  }

  function handleStepBlur() {
    if (stepText === null) return
    const step = parseWeightStep(stepText)
    if (step === null) {
      setError('Schrittweite prüfen: mehr als 0 und höchstens 99,99 kg.')
      return
    }
    setStepText(null)
    if (step !== exercise.weight_step_kg) void applyExerciseChange({ weight_step_kg: step })
    else setError(null)
  }

  async function handleSaveSet(setNumber: number, values: SetValues | null) {
    const workoutId = await getWorkoutId()
    if (values) {
      await saveSet(workoutId, activeId, setNumber, { ...values, next_weight_kg: null })
    } else {
      await deleteSet(workoutId, activeId, setNumber)
    }
    // Ein neuer oder geänderter Satz macht eine frühere Antwort ungültig, die Frage kommt dann neu.
    onSetChange(activeId, setNumber, values && { ...values, next_weight_kg: null })
    // Das Arbeitsgewicht ist der schwerste Satz. Es füllt noch leere Sätze und steuert den Hinweis.
    const weight = values?.weight_kg
    const current = exercise.current_weight_kg
    if (weight != null && (current === null || (assisted ? weight < current : weight > current))) {
      await applyExerciseChange({ current_weight_kg: weight })
    }
  }

  const statusIcon = (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${
        done ? 'bg-yellow-400 font-bold text-neutral-950' : 'border border-neutral-700'
      }`}
      aria-hidden="true"
    >
      {done ? '✓' : ''}
    </span>
  )

  const subtitle = (
    <span
      className={`block truncate text-sm tabular-nums ${hint && !done ? 'text-yellow-300' : 'text-neutral-500'}`}
    >
      {logged.length > 0 ? formatPerformance(logged, unit) : hint && !bodyVisible ? hintText : target}
    </span>
  )

  const settingsButton = showSettingsButton && (
    <button
      className={`mr-2 h-11 w-11 shrink-0 rounded-lg text-lg ${
        showSettings ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500'
      }`}
      type="button"
      aria-label={`Einstellungen für ${exercise.name}`}
      aria-expanded={showSettings}
      onClick={() => setShowSettings((current) => !current)}
    >
      {'⚙︎'}
    </button>
  )

  const header = isDetail ? (
    <div className="flex items-center">
      <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2">
        {statusIcon}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-medium text-neutral-100">{exercise.name}</h3>
          {subtitle}
        </div>
      </div>
      {settingsButton}
    </div>
  ) : (
    <div className="flex items-center">
      <button
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 text-left"
        type="button"
        aria-label={
          layout === 'summary' ? `${exercise.name} anzeigen` : `${exercise.name} ${open ? 'schließen' : 'öffnen'}`
        }
        aria-expanded={layout === 'stacked' ? open : undefined}
        aria-current={layout === 'summary' && open ? 'true' : undefined}
        onClick={onToggle}
      >
        {statusIcon}
        <span className="min-w-0 flex-1">
          <span
            className={`block font-medium ${bodyVisible ? '' : 'truncate'} ${
              done && !open ? 'text-neutral-400' : 'text-neutral-100'
            }`}
          >
            {exercise.name}
          </span>
          {subtitle}
        </span>
        <span
          className={`shrink-0 text-xl text-neutral-500 transition-transform duration-300 motion-reduce:transition-none ${
            layout === 'stacked' && open ? 'rotate-90' : ''
          }`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>
      {settingsButton}
    </div>
  )

  const answer = showAnswer && (
    <div className="px-4 pb-3">
      {answered ? (
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-sm text-neutral-300">
            Nächstes Mal: <span className="font-medium tabular-nums text-neutral-100">{formatPlanned(logged)}</span>
          </p>
          <button
            className="min-h-11 shrink-0 px-2 text-sm text-neutral-400 underline disabled:opacity-50"
            type="button"
            disabled={busy}
            onClick={() => void applyAnswer(() => null)}
          >
            Ändern
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-neutral-100">
            Geschafft?
            {recommended && <span className="ml-2 font-normal text-yellow-300">Erhöhen empfohlen</span>}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-200 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={() => void applyAnswer((set) => set.weight_kg)}
            >
              {noLabel}
            </button>
            <button
              className="min-h-11 rounded-lg bg-yellow-400 px-2 py-2 text-sm font-semibold tabular-nums text-neutral-950 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={() =>
                void applyAnswer((set) =>
                  set.weight_kg === null ? null : stepWeight(set.weight_kg, exercise.weight_step_kg, direction),
                )
              }
            >
              {yesLabel}
            </button>
          </div>
        </>
      )}
      {error && !bodyVisible && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  )

  const body = (
    <div className="px-4 pb-4">
      {showSettings && (
        <div className="mb-3 space-y-2 rounded-lg bg-neutral-900/60 p-3">
          {exercise.tracking_type !== 'duration' && (
            <label className="flex items-center justify-between gap-3 text-sm text-neutral-300">
              Erfassung
              <select
                className={fieldClass}
                value={exercise.tracking_type}
                disabled={busy}
                onChange={(event) => handleTrackingChange(event.target.value as TrackingType)}
              >
                <option value="weight_reps">Mit Gewicht</option>
                <option value="assisted_reps">Mit Gewichtshilfe</option>
                <option value="reps">Ohne Gewicht</option>
              </select>
            </label>
          )}
          {weighted && (
            <label className="flex items-center justify-between gap-3 text-sm text-neutral-300">
              Schrittweite
              <span className="flex items-center gap-2 text-neutral-400">
                <input
                  className={`${fieldClass} w-20 text-center`}
                  aria-label="Schrittweite in kg"
                  inputMode="decimal"
                  value={stepText ?? String(exercise.weight_step_kg).replace('.', ',')}
                  onChange={(event) => setStepText(event.target.value)}
                  onBlur={handleStepBlur}
                />
                kg
              </span>
            </label>
          )}
          {entry.alternative && (
            <button
              className="min-h-11 text-sm text-neutral-300 underline"
              type="button"
              onClick={() => {
                const alternative = entry.alternative as Exercise
                onActiveChange(activeId === entry.exercise.id ? alternative.id : entry.exercise.id)
                setStepText(null)
                setError(null)
              }}
            >
              Stattdessen: {(activeId === entry.exercise.id ? entry.alternative : entry.exercise).name}
            </button>
          )}
          {exercise.tracking_type === 'duration' && !entry.alternative && (
            <p className="text-sm text-neutral-500">Diese Übung wird über die Dauer erfasst.</p>
          )}
        </div>
      )}

      <p className="text-sm tabular-nums text-neutral-400">
        {logged.length > 0 && <span className="mr-2 text-neutral-500">Vorgabe {target} ·</span>}
        {last.length > 0 ? `Letztes Mal: ${formatPerformance(last, unit)}` : 'Noch kein letztes Training'}
      </p>

      {hint && !done && (
        <p className="mt-2 rounded-lg bg-yellow-400/10 px-3 py-2 text-sm font-medium text-yellow-300">{hintText}</p>
      )}

      {error && bodyVisible && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}

      <div className="mt-3 flex gap-1.5 text-center text-xs text-neutral-500" aria-hidden="true">
        <span className="w-4 shrink-0">{isRounds ? 'R' : '#'}</span>
        {exercise.tracking_type === 'duration' ? (
          <span className="flex-1">{unit === 'minutes' ? 'Minuten' : 'Sekunden'}</span>
        ) : (
          <>
            {weighted && <span className="flex-[2]">{assisted ? 'Hilfe (kg)' : 'kg'}</span>}
            <span className="flex-1">Wdh.</span>
          </>
        )}
        <span className="w-10 shrink-0" />
      </div>

      <ul>
        {rows.map((setNumber) => {
          const lastSet = last.find((set) => set.set_number === setNumber)
          const placeholderValue =
            exercise.tracking_type === 'duration'
              ? lastSet?.duration_seconds != null
                ? unit === 'minutes'
                  ? lastSet.duration_seconds / 60
                  : lastSet.duration_seconds
                : ''
              : (lastSet?.reps ?? '')
          return (
            <SetRow
              key={setKey(activeId, setNumber)}
              label={isRounds ? `Runde ${setNumber}` : `Satz ${setNumber}`}
              rowNumber={setNumber}
              userId={userId}
              date={today}
              exerciseId={activeId}
              setNumber={setNumber}
              tracking={exercise.tracking_type}
              unit={unit}
              workingWeight={exercise.current_weight_kg}
              saved={savedSets[setKey(activeId, setNumber)] ?? null}
              initialDraft={readDraft(userId, today, activeId, setNumber)}
              placeholder={String(placeholderValue).replace('.', ',')}
              plannedWeight={lastSet && lastSet.is_assisted === assisted && weighted ? plannedWeight(lastSet) : null}
              resetRequest={resetRequest}
              weightStep={exercise.weight_step_kg}
              onSave={handleSaveSet}
            />
          )
        })}
      </ul>
    </div>
  )

  if (isDetail) {
    return (
      <section aria-label={exercise.name} className="rounded-xl border border-neutral-700 bg-neutral-800/70">
        {header}
        {answer}
        {body}
      </section>
    )
  }

  // In der Laptop-Liste markiert ein gelber Rand die Übung, die rechts offen ist.
  const openStyle = layout === 'summary' ? 'border-yellow-400/60 bg-neutral-800/70' : 'border-neutral-700 bg-neutral-800/70'
  return (
    <li
      ref={cardRef}
      aria-label={exercise.name}
      className={`scroll-mt-16 rounded-xl border transition-colors duration-300 motion-reduce:transition-none ${
        open ? openStyle : 'border-neutral-800 bg-neutral-800/30'
      }`}
    >
      {header}
      {answer}
      {layout === 'stacked' && (
        // Die Höhe von 0fr auf 1fr animiert das Aufklappen ohne feste Pixelwerte.
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
          inert={!open}
        >
          <div className="min-h-0 overflow-hidden">{body}</div>
        </div>
      )}
    </li>
  )
}
