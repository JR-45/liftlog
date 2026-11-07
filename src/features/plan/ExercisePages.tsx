import { useEffect, useRef, useState } from 'react'
import type { TrackingType } from '../../domain/sets'
import type { PlanExerciseDraft } from '../../domain/trainingPlan'
import { newExercise } from './api'
import { ExercisePicker } from './ExercisePicker'

const INPUT = 'mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-neutral-100'
const BUTTON = 'min-h-11 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 disabled:opacity-40'

function Range({ label, min, max, limit, onChange }: {
  label: string; min: number | null; max: number | null; limit: number
  onChange: (min: number | null, max: number | null) => void
}) {
  return (
    <fieldset className="mt-3">
      <legend className="text-sm text-neutral-400">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-neutral-400">Minimum
          <input className={INPUT} type="number" min="1" max={limit} step="1" value={min ?? ''}
            onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value), max)} />
        </label>
        <label className="text-xs text-neutral-400">Maximum
          <input className={INPUT} type="number" min={min ?? 1} max={limit} step="1" value={max ?? ''}
            onChange={(event) => onChange(min, event.target.value === '' ? null : Number(event.target.value))} />
        </label>
      </div>
    </fieldset>
  )
}

export function ExercisePages({ exercises, onChange, reveal }: {
  exercises: PlanExerciseDraft[]; onChange: (exercises: PlanExerciseDraft[]) => void
  reveal?: { index: number }
}) {
  const [page, setPage] = useState(0)
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [lastReveal, setLastReveal] = useState(reveal)
  const heading = useRef<HTMLHeadingElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const index = Math.min(page, exercises.length - 1)
  const exercise = exercises[index]

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
    setPickerIndex(null)
    heading.current?.focus()
  }

  function update(changes: Partial<PlanExerciseDraft>) {
    onChange(exercises.map((item, i) => i === index ? { ...item, ...changes } : item))
  }

  function trackingChanges(tracking_type: TrackingType): Partial<PlanExerciseDraft> {
    return {
      tracking_type, alternative_exercise_id: null,
      reps_min: tracking_type === 'duration' ? null : 8, reps_max: tracking_type === 'duration' ? null : 12,
      duration_min: tracking_type === 'duration' ? 30 : null, duration_max: tracking_type === 'duration' ? 60 : null,
    }
  }

  return (
    <div className="exercise-book mt-5">
      <div className="flex items-center justify-between gap-2">
        <button className={BUTTON} type="button" aria-label="Vorherige Übung" disabled={index === 0} onClick={() => turn(index - 1)}>‹ Zurück</button>
        <h4 ref={heading} tabIndex={-1} className="rounded text-center text-sm font-medium text-yellow-300" aria-live="polite">Übung {index + 1}</h4>
        <button className={BUTTON} type="button" aria-label="Nächste Übung" disabled={index === exercises.length - 1} onClick={() => turn(index + 1)}>Weiter ›</button>
      </div>
      <label className="mt-3 block text-sm text-neutral-400">Direkt zur Übung
        <select className={INPUT} value={index} onChange={(event) => turn(Number(event.target.value))}>
          {exercises.map((item, i) => <option key={i} value={i}>{i + 1}. {item.name || 'Neue Übung'}</option>)}
        </select>
      </label>
      <div className="exercise-page mt-3 rounded-xl border border-neutral-700 bg-neutral-950/30 p-3" key={index}
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
        <p className="mb-3 text-sm font-medium text-neutral-200">{exercise.name || 'Neue Übung auswählen'}</p>
        {(!exercise.name || pickerIndex === index) ? (
          <ExercisePicker onSelect={(selected) => {
            update({ name: selected.name, ...trackingChanges(selected.tracking_type) })
            setPickerIndex(null)
          }} />
        ) : (
          <button className={`${BUTTON} mb-3 w-full`} type="button" onClick={() => setPickerIndex(index)}>Übung wechseln</button>
        )}
        <label className="block text-sm text-neutral-400">Übungsname
          <input className={INPUT} maxLength={100} value={exercise.name} placeholder="z. B. Bankdrücken"
            onChange={(event) => update({ name: event.target.value })} />
        </label>
        <label className="mt-3 block text-sm text-neutral-400">Erfassung
          <select className={INPUT} value={exercise.tracking_type} onChange={(event) => update(trackingChanges(event.target.value as TrackingType))}>
            <option value="weight_reps">Gewicht + Wiederholungen</option>
            <option value="assisted_reps">Gewichtshilfe + Wiederholungen</option>
            <option value="reps">Nur Wiederholungen</option>
            <option value="duration">Dauer</option>
          </select>
        </label>
        <Range label="Sätze" min={exercise.sets_min} max={exercise.sets_max} limit={100}
          onChange={(min, max) => update({ sets_min: min ?? 0, sets_max: max ?? 0 })} />
        {exercise.tracking_type === 'duration' ? (
          <Range label="Dauer in Sekunden (optional)" min={exercise.duration_min} max={exercise.duration_max} limit={86400}
            onChange={(min, max) => update({ duration_min: min, duration_max: max })} />
        ) : (
          <Range label="Wiederholungen (optional)" min={exercise.reps_min} max={exercise.reps_max} limit={999}
            onChange={(min, max) => update({ reps_min: min, reps_max: max })} />
        )}
        <button className={`${BUTTON} mt-4 text-red-300`} type="button" disabled={exercises.length === 1} onClick={() => {
          onChange(exercises.filter((_, i) => i !== index))
          turn(Math.max(0, index - 1))
        }}>Diese Übung entfernen</button>
      </div>
      <button className={`${BUTTON} mt-4 w-full`} type="button" onClick={() => {
        onChange([...exercises, newExercise()])
        turn(exercises.length)
      }}>+ Übung hinzufügen</button>
    </div>
  )
}
