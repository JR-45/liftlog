import { useState } from 'react'
import { progressionHint } from '../../domain/progression'
import {
  countLoggedSets,
  type DurationUnit,
  formatPerformance,
  formatRange,
  formatWeight,
  parseWeightStep,
  setKey,
  type SetValues,
  stepWeight,
  type TrackingType,
  usesWeight,
} from '../../domain/sets'
import { deleteSet, type Exercise, type LoggedSet, type PlanEntry, saveSet, updateExercise } from './api'
import { readDraft } from './drafts'
import { SetRow } from './SetRow'

const stepButtonClass =
  'h-11 w-11 rounded-lg border border-neutral-700 bg-neutral-900 text-xl text-neutral-100 disabled:opacity-40'
const fieldClass =
  'h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-base text-neutral-100 outline-none focus:border-emerald-400 disabled:opacity-50'

type Props = {
  entry: PlanEntry
  userId: string
  today: string
  savedSets: Record<string, SetValues>
  lastSets: LoggedSet[]
  getWorkoutId: () => Promise<string>
  onSetChange: (exerciseId: string, setNumber: number, values: SetValues | null) => void
}

export function ExerciseCard({ entry, userId, today, savedSets, lastSets, getWorkoutId, onSetChange }: Props) {
  const [exercises, setExercises] = useState<Record<string, Exercise>>(() => {
    const all = entry.alternative ? [entry.exercise, entry.alternative] : [entry.exercise]
    return Object.fromEntries(all.map((exercise) => [exercise.id, exercise]))
  })
  // Wurde heute schon die Alternative trainiert, öffnet die Karte direkt mit ihr.
  const [activeId, setActiveId] = useState(() => {
    const { alternative, exercise } = entry
    const usedAlternative = alternative && countLoggedSets(savedSets, [alternative.id]) > 0
    const usedMain = countLoggedSets(savedSets, [exercise.id]) > 0
    return usedAlternative && !usedMain ? alternative.id : exercise.id
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // null: Das Feld zeigt den gespeicherten Wert, sonst die laufende Eingabe.
  const [stepText, setStepText] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  // null: Die Karte klappt automatisch zu, sobald alle Sätze gespeichert sind.
  const [openOverride, setOpenOverride] = useState<boolean | null>(null)

  const exercise = exercises[activeId]
  const weighted = usesWeight(exercise.tracking_type)
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

  const rows = Array.from({ length: entry.sets_max }, (_, index) => index + 1)
  const logged = rows.flatMap((setNumber) => {
    const set = savedSets[setKey(activeId, setNumber)]
    return set ? [set] : []
  })
  const allLogged = logged.length >= entry.sets_max
  const open = openOverride ?? !allLogged

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
    onSetChange(activeId, setNumber, values)
    // Das erste eingetragene Gewicht wird zum Arbeitsgewicht, damit niemand bis 60 kg klicken muss.
    if (values?.weight_kg != null && exercise.current_weight_kg === null) {
      await applyExerciseChange({ current_weight_kg: values.weight_kg })
    }
  }

  if (!open) {
    return (
      <li aria-label={exercise.name} className="rounded-xl border border-neutral-800 bg-neutral-800/30">
        <button
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
          type="button"
          aria-label={`${exercise.name} aufklappen`}
          aria-expanded="false"
          onClick={() => setOpenOverride(true)}
        >
          <span className="text-emerald-400" aria-hidden="true">✓</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-neutral-200">{exercise.name}</span>
            <span className="block truncate text-sm tabular-nums text-neutral-500">
              {formatPerformance(logged, unit)}
            </span>
          </span>
          <span className="text-neutral-500" aria-hidden="true">›</span>
        </button>
      </li>
    )
  }

  return (
    <li aria-label={exercise.name} className="rounded-xl border border-neutral-800 bg-neutral-800/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-medium text-neutral-100">{exercise.name}</h2>
          <p className="mt-0.5 text-sm tabular-nums text-neutral-400">{target}</p>
        </div>
        <div className="flex shrink-0 items-center">
          {logged.length > 0 && (
            <button
              className="h-11 px-2 text-sm text-neutral-400"
              type="button"
              onClick={() => setOpenOverride(false)}
            >
              Einklappen
            </button>
          )}
          <button
            className={`h-11 w-11 rounded-lg text-lg ${showSettings ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500'}`}
            type="button"
            aria-label={`Einstellungen für ${exercise.name}`}
            aria-expanded={showSettings}
            onClick={() => setShowSettings((current) => !current)}
          >
            {'⚙︎'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-2 space-y-2 rounded-lg bg-neutral-900/60 p-3">
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
                setActiveId(activeId === entry.exercise.id ? alternative.id : entry.exercise.id)
                setStepText(null)
                setError(null)
                setOpenOverride(null)
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

      <p className="mt-2 text-sm tabular-nums text-neutral-400">
        {last.length > 0 ? `Letztes Mal: ${formatPerformance(last, unit)}` : 'Noch kein letztes Training'}
      </p>

      {hint && (
        <p className="mt-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300">
          {hint === 'increase_weight' ? 'Gewicht erhöhen empfohlen' : 'Gewichtshilfe senken empfohlen'}
        </p>
      )}

      {weighted && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-neutral-300">{weightName}</span>
          <div className="flex items-center gap-1">
            <button
              className={stepButtonClass}
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
            <span className="w-20 text-center font-medium tabular-nums text-neutral-100" aria-live="polite">
              {formatWeight(exercise.current_weight_kg)}
            </span>
            <button
              className={stepButtonClass}
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

      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}

      <div className="mt-3 flex gap-2 text-center text-xs text-neutral-500" aria-hidden="true">
        <span className="w-6 shrink-0">{isRounds ? 'R' : '#'}</span>
        {exercise.tracking_type === 'duration' ? (
          <span className="flex-1">{unit === 'minutes' ? 'Minuten' : 'Sekunden'}</span>
        ) : (
          <>
            {weighted && (
              <span className="flex-1">{exercise.tracking_type === 'assisted_reps' ? 'Hilfe (kg)' : 'kg'}</span>
            )}
            <span className="flex-1">Wdh.</span>
          </>
        )}
        <span className="w-11 shrink-0" />
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
              onSave={handleSaveSet}
            />
          )
        })}
      </ul>
    </li>
  )
}
