import { useEffect, useRef, useState } from 'react'
import { EXERCISE_CATALOG } from '../../domain/exerciseCatalog'
import type { TrackingType } from '../../domain/sets'
import type { PlanExerciseDraft } from '../../domain/trainingPlan'
import { newExercise } from './api'

const INPUT = 'mt-1 h-11 w-full min-w-0 rounded-xl bg-[#2C2C2E] px-3 text-base text-white outline-none focus:ring-2 focus:ring-neon'
const BUTTON = 'min-h-11 rounded-xl bg-[#2C2C2E] px-3 py-2 text-sm font-medium text-white disabled:opacity-40'
const LABEL = 'block text-sm text-[#8E8E93]'
const GROUPS = [...new Set(EXERCISE_CATALOG.map((exercise) => exercise.group))]
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

export function ExercisePages({ exercises, onChange, reveal }: {
  exercises: PlanExerciseDraft[]; onChange: (exercises: PlanExerciseDraft[]) => void
  reveal?: { index: number }
}) {
  const [page, setPage] = useState(0)
  const [lastReveal, setLastReveal] = useState(reveal)
  const [showMore, setShowMore] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const index = Math.min(page, exercises.length - 1)
  const exercise = exercises[index]
  const inCatalog = EXERCISE_CATALOG.some((item) => item.name === exercise.name)
  const isDuration = exercise.tracking_type === 'duration'

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
    const selected = EXERCISE_CATALOG.find((item) => item.name === value)
    if (selected) update({ name: selected.name, ...trackingChanges(selected.tracking_type) })
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
        <h4 ref={heading} tabIndex={-1} className="text-center text-sm font-semibold tabular-nums text-neon" aria-live="polite">Übung {index + 1} von {exercises.length}</h4>
        <button className={BUTTON} type="button" aria-label="Nächste Übung" disabled={index === exercises.length - 1} onClick={() => turn(index + 1)}>Weiter ›</button>
      </div>

      <div className="exercise-page mt-3 space-y-3 rounded-2xl bg-[#141416] p-3.5 ring-1 ring-white/[0.06]" key={index}
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
          <select className={INPUT} value={inCatalog || exercise.name ? exercise.name : ''} onChange={(event) => selectExercise(event.target.value)}>
            <option value="">Bitte auswählen …</option>
            {exercise.name && !inCatalog && <option value={exercise.name}>{exercise.name}</option>}
            {GROUPS.map((group) => <optgroup key={group} label={group}>
              {EXERCISE_CATALOG.filter((item) => item.group === group).map((item) => <option key={item.name}>{item.name}</option>)}
            </optgroup>)}
            <option value={CUSTOM}>Eigene Übung …</option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <label className={`${LABEL} w-20 shrink-0`}>Sätze
            <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="100" step="1" value={exercise.sets_max || ''}
              onChange={(event) => updateSets(Number(event.target.value))} />
          </label>
          {isDuration ? <>
            <label className={`${LABEL} min-w-0 flex-1`}>Sek. von
              <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="86400" step="1" value={exercise.duration_min ?? ''}
                onChange={(event) => update({ duration_min: numberOrNull(event.target.value) })} />
            </label>
            <span className="pb-3 text-[#8E8E93]" aria-hidden="true">–</span>
            <label className={`${LABEL} min-w-0 flex-1`}>bis
              <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="86400" step="1" value={exercise.duration_max ?? ''}
                onChange={(event) => update({ duration_max: numberOrNull(event.target.value) })} />
            </label>
          </> : <>
            <label className={`${LABEL} min-w-0 flex-1`}>Wdh. von
              <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="999" step="1" value={exercise.reps_min ?? ''}
                onChange={(event) => update({ reps_min: numberOrNull(event.target.value) })} />
            </label>
            <span className="pb-3 text-[#8E8E93]" aria-hidden="true">–</span>
            <label className={`${LABEL} min-w-0 flex-1`}>bis
              <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="999" step="1" value={exercise.reps_max ?? ''}
                onChange={(event) => update({ reps_max: numberOrNull(event.target.value) })} />
            </label>
          </>}
        </div>

        <button className="min-h-11 text-sm font-medium text-[#8E8E93]" type="button" aria-expanded={showMore} onClick={() => setShowMore((current) => !current)}>
          {showMore ? 'Weniger Optionen' : 'Mehr Optionen'}
        </button>

        {showMore && <div className="space-y-3 border-t border-white/[0.06] pt-3">
          <label className={LABEL}>Eigener Name
            <input className={INPUT} maxLength={100} value={exercise.name} placeholder="z. B. Bankdrücken"
              onChange={(event) => update({ name: event.target.value })} />
          </label>
          <label className={LABEL}>Erfassung
            <select className={INPUT} value={exercise.tracking_type} onChange={(event) => update(trackingChanges(event.target.value as TrackingType))}>
              <option value="weight_reps">Gewicht + Wiederholungen</option>
              <option value="assisted_reps">Gewichtshilfe + Wiederholungen</option>
              <option value="reps">Nur Wiederholungen</option>
              <option value="duration">Dauer</option>
            </select>
          </label>
          <label className={LABEL}>Mindestens Sätze (für Bereiche wie 4–5 Runden)
            <input className={`${INPUT} text-center tabular-nums`} type="number" inputMode="numeric" min="1" max="100" step="1" value={exercise.sets_min || ''}
              onChange={(event) => update({ sets_min: Number(event.target.value) })} />
          </label>
          <button className="min-h-11 text-sm font-medium text-[#FF453A] disabled:opacity-40" type="button" disabled={exercises.length === 1} onClick={() => {
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
