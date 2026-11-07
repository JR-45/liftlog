import { TimeWheelInput } from '../../components/TimeWheelInput'
import { NumberWheelInput } from '../../components/NumberWheelInput'
import { useEffect, useRef, useState } from 'react'
import { findExercises } from '../../domain/exerciseCatalog'
import { exerciseDefaults, isCardioExercise } from '../../domain/cardio'
import type { TrackingType } from '../../domain/sets'
import type { PlanExerciseDraft } from '../../domain/trainingPlan'
import { newExercise } from './api'

const INPUT = 'mt-1 h-11 w-full min-w-0 rounded-xl bg-control px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-neon'
const BUTTON = 'min-h-11 rounded-xl bg-control px-3 py-2 text-sm font-medium text-foreground disabled:opacity-40'
const LABEL = 'block text-sm text-muted'
const CUSTOM = '__eigene_uebung__'

function numberOrNull(value: string): number | null {
  return value === '' ? null : Number(value)
}

function trackingChanges(tracking_type: TrackingType): Partial<PlanExerciseDraft> {
  return {
    tracking_type, alternative_exercise_id: null,
    reps_min: tracking_type === 'duration' ? null : 8, reps_max: tracking_type === 'duration' ? null : 12,
    duration_min: tracking_type === 'duration' ? 30 : null, duration_max: tracking_type === 'duration' ? 60 : null,
  }
}

export function ExercisePages({ exercises, onChange, reveal, exerciseGroup }: {
  exercises: PlanExerciseDraft[]; onChange: (exercises: PlanExerciseDraft[]) => void
  reveal?: { index: number }
  exerciseGroup?: string
}) {
  const [page, setPage] = useState(0)
  const [lastReveal, setLastReveal] = useState(reveal)
  const [showMore, setShowMore] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const index = Math.min(page, exercises.length - 1)
  const exercise = exercises[index]
  const available = findExercises('', exerciseGroup)
  const groups = [...new Set(available.map(item => item.group))]
  const inCatalog = available.some((item) => item.name === exercise.name)
  const isDuration = exercise.tracking_type === 'duration'
  const cardio = isDuration && isCardioExercise(exercise.name)

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

  function update(changes: Partial<PlanExerciseDraft>) {
    onChange(exercises.map((item, i) => i === index ? { ...item, ...changes } : item))
  }

  function selectExercise(value: string) {
    if (value === CUSTOM) {
      update({ name: '' })
      setShowMore(true)
      return
    }
    const selected = available.find((item) => item.name === value)
    if (selected) update({ name: selected.name, ...exerciseDefaults(selected.name, selected.tracking_type),
      ...(!cardio && !isCardioExercise(selected.name) ? { sets_min: exercise.sets_min, sets_max: exercise.sets_max } : {}),
    })
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
        <h4 ref={heading} tabIndex={-1} className="text-center text-sm font-semibold tabular-nums text-accent-ink" aria-live="polite">Übung {index + 1} von {exercises.length}</h4>
        <button className={BUTTON} type="button" aria-label="Nächste Übung" disabled={index === exercises.length - 1} onClick={() => turn(index + 1)}>Weiter ›</button>
      </div>

      <div className="exercise-page mt-3 space-y-3 rounded-2xl bg-surface-inset p-3.5 ring-1 ring-line/[0.06]" key={index}
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
        <label className={LABEL}>Übung
          <select aria-label="Übung" className={INPUT} value={exerciseGroup && !inCatalog ? '' : inCatalog || exercise.name ? exercise.name : ''} onChange={(event) => selectExercise(event.target.value)}>
            <option value="">Bitte auswählen …</option>
            {!exerciseGroup && exercise.name && !inCatalog && <option value={exercise.name}>{exercise.name}</option>}
            {groups.map((group) => <optgroup key={group} label={group}>
              {available.filter((item) => item.group === group).map((item) => <option key={item.name}>{item.name}</option>)}
            </optgroup>)}
            {!exerciseGroup && <option value={CUSTOM}>Eigene Übung …</option>}
          </select>
        </label>
        {exerciseGroup && exercise.name && !inCatalog && <p className="text-sm text-danger" role="status">
          „{exercise.name}“ gehört nicht zu „{exerciseGroup}“. Wähle eine passende Übung aus.
        </p>}

        <div className="flex items-end gap-2">
          {!cardio && <label className={`${LABEL} w-20 shrink-0`}>Sätze
            <NumberWheelInput className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="20" step="1" value={exercise.sets_max || ''}
              onValueChange={(value) => updateSets(Number(value))} />
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
              <NumberWheelInput className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="20" step="1" value={exercise.reps_min ?? ''}
                onValueChange={(value) => update({ reps_min: numberOrNull(value) })} />
            </label>
            <span className="pb-3 text-muted" aria-hidden="true">–</span>
            <label className={`${LABEL} min-w-0 flex-1`}>bis
              <NumberWheelInput className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="20" step="1" value={exercise.reps_max ?? ''}
                onValueChange={(value) => update({ reps_max: numberOrNull(value) })} />
            </label>
          </>}
        </div>

        <button className="min-h-11 text-sm font-medium text-muted" type="button" aria-expanded={showMore} onClick={() => setShowMore((current) => !current)}>
          {showMore ? 'Weniger Optionen' : 'Mehr Optionen'}
        </button>

        {showMore && <div className="space-y-3 border-t border-line/[0.06] pt-3">
          {!exerciseGroup && <label className={LABEL}>Eigener Name
            <input className={INPUT} maxLength={100} value={exercise.name} placeholder="z. B. Bankdrücken"
              onChange={(event) => update({ name: event.target.value })} />
          </label>}
          {!cardio && <label className={LABEL}>Erfassung
            <select className={INPUT} value={exercise.tracking_type} onChange={(event) => update(trackingChanges(event.target.value as TrackingType))}>
              <option value="weight_reps">Gewicht + Wiederholungen</option>
              <option value="assisted_reps">Gewichtshilfe + Wiederholungen</option>
              <option value="reps">Nur Wiederholungen</option>
              <option value="duration">Dauer</option>
            </select>
          </label>}
          {!cardio && <label className={LABEL}>Mindestens Sätze (für Bereiche wie 4–5 Runden)
            <NumberWheelInput className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="20" step="1" value={exercise.sets_min || ''}
              onValueChange={(value) => update({ sets_min: Number(value) })} />
          </label>}
          <button className="min-h-11 text-sm font-medium text-danger disabled:opacity-40" type="button" disabled={exercises.length === 1} onClick={() => {
            onChange(exercises.filter((_, i) => i !== index))
            turn(Math.max(0, index - 1))
          }}>Diese Übung entfernen</button>
        </div>}
      </div>

      <button className={`${BUTTON} mt-3 w-full`} type="button" onClick={() => {
        onChange([...exercises, newExercise()])
        turn(exercises.length)
      }}>+ Übung hinzufügen</button>
    </div>
  )
}
