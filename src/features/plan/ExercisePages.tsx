import { TimeWheelInput } from '../../components/TimeWheelInput'
import { useEffect, useRef, useState } from 'react'
import { EXERCISE_CATALOG, findExercises } from '../../domain/exerciseCatalog'
import { exerciseDefaults, isCardioExercise } from '../../domain/cardio'
import type { TrackingType } from '../../domain/sets'
import type { PlanExerciseDraft } from '../../domain/trainingPlan'
import { newExercise } from './api'
import { createExerciseSlots, updateExerciseSlot, type PlanExerciseSlot } from '../../domain/planExerciseSlots'
import { CloseIcon } from '../../lib/icons'

const INPUT = 'mt-1 h-11 w-full min-w-0 rounded-xl bg-control px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-neon'
const BUTTON = 'min-h-11 rounded-xl bg-control px-3 py-2 text-sm font-medium text-foreground disabled:opacity-40'
const LABEL = 'block text-sm text-muted'
const CUSTOM = '__eigene_uebung__'
const MAX_STEPS = 20

function numberOrNull(value: string): number | null {
  return value === '' ? null : Number(value)
}

function trackingChanges(tracking_type: TrackingType): Partial<PlanExerciseDraft> {
  return {
    tracking_type, alternative_exercise_id: null,
    reps_min: tracking_type === 'duration' ? null : 8, reps_max: tracking_type === 'duration' ? null : 12,
    duration_min: tracking_type === 'duration' ? 30 : null, duration_max: tracking_type === 'duration' ? 60 : null,
    ...(tracking_type === 'duration' ? { steps: [] } : {}),
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
  const steps = exercise.steps ?? []
  const isCircuit = steps.length > 0

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

  function updateStep(position: number, value: string) {
    update({ steps: steps.map((step, i) => i === position ? value : step) })
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
          </> : <>
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

        {isCircuit && <fieldset className="space-y-2">
          <legend className={LABEL}>Bewegungen pro Runde</legend>
          {steps.map((step, i) => <div key={i} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right text-sm tabular-nums text-muted" aria-hidden="true">{i + 1}</span>
            <input className={INPUT.replace('mt-1 ', '')} aria-label={`Bewegung ${i + 1}`} maxLength={60} value={step} placeholder="z. B. Swing"
              onChange={(event) => updateStep(i, event.target.value)} />
            <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:text-danger" type="button"
              aria-label={`Bewegung ${i + 1} entfernen`} onClick={() => update({ steps: steps.filter((_, j) => j !== i) })}>
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>)}
          {steps.length < MAX_STEPS && <button className={`${BUTTON} w-full`} type="button" onClick={() => update({ steps: [...steps, ''] })}>
            Bewegung hinzufügen
          </button>}
        </fieldset>}

        <button className="min-h-11 text-sm font-medium text-muted" type="button" aria-expanded={showMore} onClick={() => setShowMore((current) => !current)}>
          {showMore ? 'Weniger Optionen' : 'Mehr Optionen'}
        </button>

        {showMore && <div className="space-y-3 border-t border-line/[0.06] pt-3">
          <label className={LABEL}>Eigener Name
            <input className={INPUT} maxLength={100} value={exercise.name} placeholder="z. B. Bankdrücken"
              onChange={(event) => update({ name: event.target.value })} />
          </label>
          {!cardio && <label className={LABEL}>Erfassung
            <select className={INPUT} value={exercise.tracking_type} onChange={(event) => update(trackingChanges(event.target.value as TrackingType))}>
              <option value="weight_reps">Gewicht + Wiederholungen</option>
              <option value="assisted_reps">Gewichtshilfe + Wiederholungen</option>
              <option value="reps">Nur Wiederholungen</option>
              <option value="duration">Dauer</option>
            </select>
          </label>}
          {!isDuration && !isCircuit && <button className={`${BUTTON} w-full`} type="button" onClick={() => update({ steps: [''] })}>
            Als Zirkel mit Bewegungen
          </button>}
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
