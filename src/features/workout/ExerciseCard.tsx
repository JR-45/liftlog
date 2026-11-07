import { useState } from 'react'
import { progressionHint } from '../../domain/progression'
import {
  type DurationUnit,
  formatPerformance,
  formatRange,
  formatWeight,
  parseWeightStep,
  type SetValues,
  stepWeight,
  type TrackingType,
  usesWeight,
} from '../../domain/sets'
import { deleteSet, type Exercise, type LoggedSet, type PlanEntry, saveSet, updateExercise } from './api'
import { readDraft } from './drafts'
import { SetRow } from './SetRow'

const roundButtonClass =
  'h-11 w-11 rounded-lg border border-neutral-700 text-xl text-neutral-100 disabled:opacity-40'

type Props = {
  entry: PlanEntry
  userId: string
  today: string
  todaySets: LoggedSet[]
  lastSets: LoggedSet[]
  getWorkoutId: () => Promise<string>
}

function setKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}:${setNumber}`
}

export function ExerciseCard({ entry, userId, today, todaySets, lastSets, getWorkoutId }: Props) {
  const [exercises, setExercises] = useState<Record<string, Exercise>>(() => {
    const all = entry.alternative ? [entry.exercise, entry.alternative] : [entry.exercise]
    return Object.fromEntries(all.map((exercise) => [exercise.id, exercise]))
  })
  // Wurde heute schon die Alternative trainiert, öffnet die Karte direkt mit ihr.
  const [activeId, setActiveId] = useState(() => {
    const usedAlternative = entry.alternative && todaySets.some((set) => set.exercise_id === entry.alternative?.id)
    const usedMain = todaySets.some((set) => set.exercise_id === entry.exercise.id)
    return usedAlternative && !usedMain && entry.alternative ? entry.alternative.id : entry.exercise.id
  })
  const [savedSets, setSavedSets] = useState<Record<string, SetValues>>(() =>
    Object.fromEntries(todaySets.map((set) => [setKey(set.exercise_id, set.set_number), set])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // null: Das Feld zeigt den gespeicherten Wert, sonst die laufende Eingabe.
  const [stepText, setStepText] = useState<string | null>(null)

  const exercise = exercises[activeId]
  const weightName = exercise.tracking_type === 'assisted_reps' ? 'Gewichtshilfe' : 'Arbeitsgewicht'
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

  /** Speichert zuerst und ändert die Anzeige nur bei Erfolg. */
  async function applyExerciseChange(
    changes: Partial<Pick<Exercise, 'current_weight_kg' | 'tracking_type' | 'weight_step_kg'>>,
  ) {
    setBusy(true)
    setError(null)
    try {
      await updateExercise(activeId, changes)
      setExercises((current) => ({ ...current, [activeId]: { ...current[activeId], ...changes } }))
    } catch {
      setError('Die Änderung wurde nicht gespeichert. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  function handleTrackingChange(next: TrackingType) {
    // Hilfe und Gewicht bedeuten Gegenteiliges: 30 kg Hilfe dürfen nicht zu 30 kg Zusatzgewicht werden.
    const assistChanged = (exercise.tracking_type === 'assisted_reps') !== (next === 'assisted_reps')
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
      await saveSet(workoutId, activeId, setNumber, values)
    } else {
      await deleteSet(workoutId, activeId, setNumber)
    }
    setSavedSets((current) => {
      const next = { ...current }
      if (values) next[setKey(activeId, setNumber)] = values
      else delete next[setKey(activeId, setNumber)]
      return next
    })
    // Das erste eingetragene Gewicht wird zum Arbeitsgewicht, damit niemand bis 60 kg klicken muss.
    if (values?.weight_kg != null && exercise.current_weight_kg === null) {
      await applyExerciseChange({ current_weight_kg: values.weight_kg })
    }
  }

  const rows = Array.from({ length: entry.sets_max }, (_, index) => index + 1)

  return (
    <li className="rounded-xl bg-neutral-800/50 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium text-neutral-100">{exercise.name}</h2>
        <span className="shrink-0 text-sm text-neutral-400">{target}</span>
      </div>

      {entry.alternative && (
        <button
          className="mt-1 py-1 text-sm text-neutral-400 underline"
          type="button"
          onClick={() => {
            const alternative = entry.alternative as Exercise
            setActiveId(activeId === entry.exercise.id ? alternative.id : entry.exercise.id)
            setStepText(null)
            setError(null)
          }}
        >
          Stattdessen: {(activeId === entry.exercise.id ? entry.alternative : entry.exercise).name}
        </button>
      )}

      <p className="mt-1 text-sm text-neutral-400">
        {last.length > 0 ? `Letztes Mal: ${formatPerformance(last, unit)}` : 'Noch kein letztes Training'}
      </p>

      {hint && (
        <p className="mt-1 text-sm font-medium text-emerald-300">
          {hint === 'increase_weight' ? 'Gewicht erhöhen empfohlen' : 'Gewichtshilfe senken empfohlen'}
        </p>
      )}

      {exercise.tracking_type !== 'duration' && (
        <label className="mt-3 flex min-h-11 items-center justify-between gap-3 text-sm text-neutral-300">
          Erfassung
          <select
            className="h-11 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-base text-neutral-100 disabled:opacity-50"
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

      {usesWeight(exercise.tracking_type) && (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-neutral-300">{weightName}</span>
          <div className="flex items-center gap-2">
            <button
              className={roundButtonClass}
              type="button"
              aria-label={`${weightName} um ${exercise.weight_step_kg} kg senken`}
              disabled={busy || !exercise.current_weight_kg}
              onClick={() =>
                void applyExerciseChange({
                  current_weight_kg: stepWeight(exercise.current_weight_kg, exercise.weight_step_kg, -1),
                })
              }
            >
              −
            </button>
            <span className="w-20 text-center text-neutral-100" aria-live="polite">
              {formatWeight(exercise.current_weight_kg)}
            </span>
            <button
              className={roundButtonClass}
              type="button"
              aria-label={`${weightName} um ${exercise.weight_step_kg} kg erhöhen`}
              disabled={busy}
              onClick={() =>
                void applyExerciseChange({
                  current_weight_kg: stepWeight(exercise.current_weight_kg, exercise.weight_step_kg, 1),
                })
              }
            >
              +
            </button>
          </div>
        </div>
      )}

      {usesWeight(exercise.tracking_type) && (
        <label className="mt-2 flex items-center justify-between text-sm text-neutral-300">
          Schrittweite
          <span className="flex items-center gap-2 text-neutral-400">
            <input
              className="h-11 w-20 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-center text-base text-neutral-100 outline-none focus:border-neutral-400"
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

      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}

      <ul className="mt-2">
        {rows.map((setNumber) => (
          <SetRow
            key={setKey(activeId, setNumber)}
            label={isRounds ? `Runde ${setNumber}` : `Satz ${setNumber}`}
            userId={userId}
            date={today}
            exerciseId={activeId}
            setNumber={setNumber}
            tracking={exercise.tracking_type}
            unit={unit}
            workingWeight={exercise.current_weight_kg}
            saved={savedSets[setKey(activeId, setNumber)] ?? null}
            initialDraft={readDraft(userId, today, activeId, setNumber)}
            onSave={handleSaveSet}
          />
        ))}
      </ul>
    </li>
  )
}
