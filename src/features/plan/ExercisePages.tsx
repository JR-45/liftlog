import { TimeWheelInput } from '../../components/TimeWheelInput'
import { useEffect, useRef, useState } from 'react'
import { EXERCISE_CATALOG, findExercises } from '../../domain/exerciseCatalog'
import { exerciseDefaults, isCardioExercise } from '../../domain/cardio'
import type { TrackingType } from '../../domain/sets'
import type { PlanExerciseDraft } from '../../domain/trainingPlan'
import type { CircuitStep } from '../../domain/circuit'
import { newExercise } from './api'
import { createExerciseSlots, updateExerciseSlot, type PlanExerciseSlot } from '../../domain/planExerciseSlots'
import { CloseIcon } from '../../lib/icons'

const INPUT = 'mt-1 h-11 w-full min-w-0 rounded-xl bg-control px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-neon'
const BUTTON = 'min-h-11 rounded-xl bg-control px-3 py-2 text-sm font-medium text-foreground disabled:opacity-40'
const LABEL = 'block text-sm text-muted'
const CUSTOM = '__eigene_uebung__'
const MAX_STEPS = 20
const STEP_INPUT = 'h-11 rounded-xl bg-control px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-neon'

function numberOrNull(value: string): number | null {
  return value === '' ? null : Number(value)
}

function trackingChanges(tracking_type: TrackingType): Partial<PlanExerciseDraft> {
  return {
    tracking_type, alternative_exercise_id: null,
    reps_min: tracking_type === 'duration' ? null : 8, reps_max: tracking_type === 'duration' ? null : 12,
    duration_min: tracking_type === 'duration' ? 30 : null, duration_max: tracking_type === 'duration' ? 60 : null,
    ...(tracking_type === 'duration' ? { steps: undefined } : {}),
  }
}

export function ExercisePages({ exercises, onChange, reveal }: {
  exercises: PlanExerciseSlot[]; onChange: (exercises: PlanExerciseSlot[]) => void
  reveal?: { index: number }
}) {
  const [page, setPage] = useState(0)
  const [lastReveal, setLastReveal] = useState(reveal)
  const [showMore, setShowMore] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const index = Math.min(page, exercises.length - 1)
  const exercise = exercises[index]
  const available = findExercises('', exercise.muscleGroup)
  const groups = [...new Set(available.map(item => item.group))]
  const inCatalog = available.some((item) => item.name === exercise.name)
  const isDuration = exercise.tracking_type === 'duration'
  const cardio = isDuration && isCardioExercise(exercise.name)
  // Ein Zirkel bleibt ein Zirkel, auch während noch keine Bewegung eingetragen ist.
  const isCircuit = exercise.steps !== undefined
  const steps = exercise.steps ?? []

  if (reveal !== lastReveal) {
    setLastReveal(reveal)
    if (reveal) setPage(reveal.index)
  }

  useEffect(() => {
    if (!reveal) return
    heading.current?.focus()
  }, [reveal])

  function turn(next: number) {
    setPage(next)
    setShowMore(false)
    heading.current?.focus()
  }

  function update(changes: Partial<PlanExerciseDraft> & { muscleGroup?: string }) {
    onChange(updateExerciseSlot(exercises, exercise.slotId, changes))
  }

  function selectExercise(value: string) {
    if (value === CUSTOM) {
      update({ name: '' })
      setShowMore(true)
      return
    }
    const selected = available.find((item) => item.name === value)
    if (selected) update({ name: selected.name, muscleGroup: selected.group, ...exerciseDefaults(selected.name, selected.tracking_type),
      ...(!cardio && !isCardioExercise(selected.name) ? { sets_min: exercise.sets_min, sets_max: exercise.sets_max } : {}),
    })
  }

  function updateStep(position: number, changes: Partial<CircuitStep>) {
    update({ steps: steps.map((step, i) => i === position ? { ...step, ...changes } : step) })
  }

  function addStep() {
    // Neue Bewegungen übernehmen Wiederholungen und Gewicht der vorigen, das ist bei Complexen meist gleich.
    update({ steps: [...steps, { name: '', reps: steps.at(-1)?.reps ?? 5, weightKg: steps.at(-1)?.weightKg ?? null }] })
  }

  function setCircuit(circuit: boolean) {
    if (circuit === isCircuit) return
    update({ steps: circuit ? [{ name: '', reps: exercise.reps_max ?? 5, weightKg: null }] : undefined })
  }

  function updateSets(value: number) {
    // Eine feste Vorgabe bleibt fest. Bei einem Bereich wie 4–5 Runden ändert sich das Maximum.
    if (exercise.sets_min === exercise.sets_max) update({ sets_min: value, sets_max: value })
    else update({ sets_min: Math.min(exercise.sets_min, value), sets_max: value })
  }

  return (
    <div className="exercise-book mt-4">
      <div className="flex items-center justify-between gap-2">
        <button className={BUTTON} type="button" aria-label="Vorherige Übung" disabled={index === 0} onClick={() => turn(index - 1)}>‹ Zurück</button>
        <h4 ref={heading} tabIndex={-1} className="text-center text-sm font-semibold tabular-nums text-accent-ink" aria-live="polite">Übung {index + 1}{exercises.length > 1 && ` von ${exercises.length}`}</h4>
        <button className={BUTTON} type="button" aria-label="Nächste Übung" disabled={index === exercises.length - 1} onClick={() => turn(index + 1)}>Weiter ›</button>
      </div>

      <div className="exercise-page mt-3 space-y-3 rounded-2xl bg-surface-inset p-3.5 ring-1 ring-line/[0.06]" key={exercise.slotId}
        onTouchStart={(event) => {
          const target = event.target as HTMLElement
          if (target.closest('input, select, button, label')) { touchStart.current = null; return }
          touchStart.current = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current
          touchStart.current = null
          if (!start) return
          const dx = event.changedTouches[0].clientX - start.x
          const dy = event.changedTouches[0].clientY - start.y
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
          if (dx < 0 && index < exercises.length - 1) turn(index + 1)
          if (dx > 0 && index > 0) turn(index - 1)
        }}>
        {!isDuration && <div className="grid grid-cols-2 gap-1 rounded-xl bg-control p-1" role="tablist" aria-label="Art der Übung">
          {([false, true] as const).map((circuit) => <button key={String(circuit)} type="button" role="tab" aria-selected={isCircuit === circuit}
            className={`min-h-10 rounded-lg text-sm font-semibold transition-colors ${isCircuit === circuit ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
            onClick={() => setCircuit(circuit)}>
            {circuit ? 'Zirkel' : 'Übung'}
          </button>)}
        </div>}
        {isCircuit ? <label className={LABEL}>Name
          <input className={INPUT} maxLength={100} value={exercise.name} placeholder="z. B. Kettlebell Complex"
            onChange={(event) => update({ name: event.target.value })} />
        </label> : <>
        <label className={LABEL}>Muskelgruppe
          <select aria-label="Muskelgruppe" className={INPUT} value={exercise.muscleGroup} onChange={event => update({ muscleGroup: event.target.value })}>
            <option value="">Alle Muskelgruppen</option>
            {[...new Set(EXERCISE_CATALOG.map(item => item.group))].map(group => <option key={group}>{group}</option>)}
          </select>
        </label>
        <label className={LABEL}>Übung
          <select aria-label="Übung" className={INPUT} value={exercise.name} onChange={(event) => selectExercise(event.target.value)}>
            <option value="">Bitte auswählen …</option>
            {exercise.name && !inCatalog && <option value={exercise.name}>{exercise.name}</option>}
            {groups.map((group) => <optgroup key={group} label={group}>
              {available.filter((item) => item.group === group).map((item) => <option key={item.name}>{item.name}</option>)}
            </optgroup>)}
            <option value={CUSTOM}>Eigene Übung …</option>
          </select>
        </label>
        </>}

        <div className="flex items-end gap-2">
          {!cardio && <label className={`${LABEL} w-20 shrink-0`}>{isCircuit ? 'Runden' : 'Sätze'}
            <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="100" step="1" value={exercise.sets_max || ''}
              onChange={(event) => updateSets(Number(event.target.value))} />
          </label>}
          {cardio ? <label className={`${LABEL} min-w-0 flex-1`}>Dauer
            <TimeWheelInput className={`${INPUT} text-center tabular-nums`} valueSeconds={exercise.duration_min ?? exercise.duration_max}
              onSecondsChange={seconds => update({ duration_min: seconds, duration_max: seconds })} />
          </label> : isDuration ? <>
            <label className={`${LABEL} min-w-0 flex-1`}>Dauer von (optional)
              <TimeWheelInput className={`${INPUT} text-center tabular-nums`} valueSeconds={exercise.duration_min}
                onSecondsChange={seconds => update({ duration_min: seconds })} />
            </label>
            <span className="pb-3 text-muted" aria-hidden="true">–</span>
            <label className={`${LABEL} min-w-0 flex-1`}>bis
              <TimeWheelInput className={`${INPUT} text-center tabular-nums`} valueSeconds={exercise.duration_max}
                onSecondsChange={seconds => update({ duration_max: seconds })} />
            </label>
          </> : isCircuit ? null : <>
            <label className={`${LABEL} min-w-0 flex-1`}>Wdh. von
              <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="999" step="1" value={exercise.reps_min ?? ''}
                onChange={(event) => update({ reps_min: numberOrNull(event.target.value) })} />
            </label>
            <span className="pb-3 text-muted" aria-hidden="true">–</span>
            <label className={`${LABEL} min-w-0 flex-1`}>bis
              <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="999" step="1" value={exercise.reps_max ?? ''}
                onChange={(event) => update({ reps_max: numberOrNull(event.target.value) })} />
            </label>
          </>}
        </div>

        {isCircuit && <fieldset>
          <legend className={LABEL}>Bewegungen pro Runde</legend>
          {steps.length > 0 && <div className="mt-1 flex gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted" aria-hidden="true">
            <span className="w-12 shrink-0">Wdh.</span><span className="w-14 shrink-0">kg</span>
            <span className="min-w-0 flex-1 text-left">Bewegung</span><span className="w-11 shrink-0" />
          </div>}
          <ol className="space-y-2">
            {steps.map((step, i) => <li key={i} className="flex items-center gap-1.5">
              <input className={`${STEP_INPUT} w-12 shrink-0 px-1 text-center tabular-nums`} aria-label={`Wiederholungen Bewegung ${i + 1}`}
                type="number" inputMode="numeric" min="1" max="999" step="1" value={step.reps ?? ''}
                onChange={(event) => updateStep(i, { reps: numberOrNull(event.target.value) })} />
              <input className={`${STEP_INPUT} w-14 shrink-0 px-1 text-center tabular-nums`} aria-label={`Gewicht Bewegung ${i + 1} in kg`}
                type="number" inputMode="decimal" min="0" max="1000" step="any" placeholder="–" value={step.weightKg ?? ''}
                onChange={(event) => updateStep(i, { weightKg: numberOrNull(event.target.value) })} />
              <input className={`${STEP_INPUT} min-w-0 flex-1 px-2`} aria-label={`Bewegung ${i + 1}`} maxLength={60} value={step.name}
                placeholder="z. B. Swing" onChange={(event) => updateStep(i, { name: event.target.value })} />
              <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:text-danger" type="button"
                aria-label={`Bewegung ${i + 1} entfernen`} onClick={() => update({ steps: steps.filter((_, j) => j !== i) })}>
                <CloseIcon className="h-4 w-4" />
              </button>
            </li>)}
          </ol>
          {steps.length < MAX_STEPS && <button className={`${BUTTON} mt-2 w-full`} type="button" onClick={addStep}>
            Bewegung hinzufügen
          </button>}
        </fieldset>}

        <button className="min-h-11 text-sm font-medium text-muted" type="button" aria-expanded={showMore} onClick={() => setShowMore((current) => !current)}>
          {showMore ? 'Weniger Optionen' : 'Mehr Optionen'}
        </button>

        {showMore && <div className="space-y-3 border-t border-line/[0.06] pt-3">
          {!isCircuit && <label className={LABEL}>Eigener Name
            <input className={INPUT} maxLength={100} value={exercise.name} placeholder="z. B. Bankdrücken"
              onChange={(event) => update({ name: event.target.value })} />
          </label>}
          {!cardio && !isCircuit && <label className={LABEL}>Erfassung
            <select className={INPUT} value={exercise.tracking_type} onChange={(event) => update(trackingChanges(event.target.value as TrackingType))}>
              <option value="weight_reps">Gewicht + Wiederholungen</option>
              <option value="assisted_reps">Gewichtshilfe + Wiederholungen</option>
              <option value="reps">Nur Wiederholungen</option>
              {!isCircuit && <option value="duration">Dauer</option>}
            </select>
          </label>}
          {!cardio && <label className={LABEL}>{isCircuit ? 'Mindestens Runden (für Bereiche wie 4–5)' : 'Mindestens Sätze (für Bereiche wie 4–5 Runden)'}
            <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="100" step="1" value={exercise.sets_min || ''}
              onChange={(event) => update({ sets_min: Number(event.target.value) })} />
          </label>}
        </div>}
      </div>

      <div className={`mt-3 grid gap-2 ${exercises.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {exercises.length > 1 && <button className="min-h-11 rounded-xl bg-control px-3 py-2 text-sm font-medium text-danger" type="button" onClick={() => {
          onChange(exercises.filter(item => item.slotId !== exercise.slotId))
          turn(Math.max(0, index - 1))
        }}>Übung löschen</button>}
        <button className={BUTTON} type="button" onClick={() => {
          onChange([...exercises, ...createExerciseSlots([newExercise()], () => crypto.randomUUID())])
          turn(exercises.length)
        }}>{exercises.length === 1 ? '+ Übung hinzufügen' : 'Übung hinzufügen'}</button>
      </div>
    </div>
  )
}
