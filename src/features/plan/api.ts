import type { TrackingType } from '../../domain/sets'
import { isCardioExercise } from '../../domain/cardio'
import { supabase } from '../../lib/supabase'
import { loadPlanDays, type PlanEntry } from '../workout/api'
import type { PlanDayDraft, PlanExerciseDraft } from '../../domain/trainingPlan'
export type { PlanDayDraft, PlanExerciseDraft } from '../../domain/trainingPlan'

export function newExercise(): PlanExerciseDraft {
  return {
    name: '', tracking_type: 'weight_reps', alternative_exercise_id: null,
    sets_min: 3, sets_max: 3, reps_min: 8, reps_max: 12, duration_min: null, duration_max: null,
  }
}

export async function loadPlan(): Promise<PlanDayDraft[]> {
  const [days, result] = await Promise.all([
    loadPlanDays(),
    supabase.from('plan_exercises').select(`plan_day_id, sets_min, sets_max, reps_min, reps_max, duration_min, duration_max,
      alternative_exercise_id, exercise:exercises!plan_exercises_exercise_id_user_id_fkey(name, tracking_type)`)
      .order('position'),
  ])
  if (result.error) throw result.error
  const entries = result.data as unknown as (Pick<PlanEntry, 'sets_min' | 'sets_max' | 'reps_min' | 'reps_max' | 'duration_min' | 'duration_max'> & {
    plan_day_id: string; alternative_exercise_id: string | null; exercise: { name: string; tracking_type: TrackingType }
  })[]
  return days.map((day) => ({
      weekday: day.weekday,
      name: day.name,
      exercises: entries.filter((entry) => entry.plan_day_id === day.id).map((entry) => ({
        name: entry.exercise.name,
        tracking_type: entry.exercise.tracking_type,
        alternative_exercise_id: entry.alternative_exercise_id,
        sets_min: entry.exercise.tracking_type === 'duration' && isCardioExercise(entry.exercise.name) ? 1 : entry.sets_min,
        sets_max: entry.exercise.tracking_type === 'duration' && isCardioExercise(entry.exercise.name) ? 1 : entry.sets_max,
        reps_min: entry.reps_min, reps_max: entry.reps_max,
        duration_min: entry.duration_min, duration_max: entry.duration_max,
      })),
  }))
}

export async function loadPlanSettings(): Promise<{ method: string; split: string }> {
  const { data, error } = await supabase.from('training_plan_settings').select('method, split').maybeSingle()
  if (error) throw error
  return data ?? { method: 'classic', split: 'custom' }
}

export async function savePlan(days: PlanDayDraft[], method: string, split: string): Promise<void> {
  const { error } = await supabase.rpc('save_training_plan_config', { days, chosen_method: method, chosen_split: split })
  if (error) throw error
}
