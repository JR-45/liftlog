import { EXERCISE_CATALOG } from './exerciseCatalog'
import type { DurationUnit, TrackingType } from './sets'
import type { PlanExerciseDraft } from './trainingPlan'

/** Pace wird aus den gespeicherten Werten berechnet, nicht separat gespeichert. */
export function formatPace(seconds: number, distance: number): string | null {
  if (!Number.isFinite(seconds) || !Number.isFinite(distance) || seconds <= 0 || distance <= 0) return null
  const pace = Math.round(seconds / distance)
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, '0')} min/km`
}

export function formatSpeed(seconds: number, distance: number): string | null {
  if (!Number.isFinite(seconds) || !Number.isFinite(distance) || seconds <= 0 || distance <= 0) return null
  return `${Number((distance * 3600 / seconds).toFixed(1)).toLocaleString('de-DE')} km/h`
}

export function durationUnitForTarget(seconds: number | null): DurationUnit {
  return seconds === null || seconds >= 120 ? 'minutes' : 'seconds'
}

export function isCardioExercise(name: string): boolean {
  return EXERCISE_CATALOG.some(item => item.name === name && item.group === 'Cardio & Ausdauer')
}

export function supportsGps(name: string): boolean {
  return EXERCISE_CATALOG.some(item => item.name === name && item.gps === true)
}

export function exerciseDefaults(name: string, tracking_type: TrackingType): Partial<PlanExerciseDraft> {
  const cardio = isCardioExercise(name)
  return {
    tracking_type, alternative_exercise_id: null,
    sets_min: cardio ? 1 : 3, sets_max: cardio ? 1 : 3,
    reps_min: tracking_type === 'duration' ? null : 8,
    reps_max: tracking_type === 'duration' ? null : 12,
    duration_min: tracking_type === 'duration' && !cardio ? 30 : null,
    duration_max: tracking_type === 'duration' && !cardio ? 60 : null,
  }
}
