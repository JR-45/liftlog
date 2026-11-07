import type { SetValues, TrackingType } from '../../domain/sets'
import { supabase } from '../../lib/supabase'

export type PlanDay = { id: string; weekday: number; name: string }

export type Exercise = {
  id: string
  name: string
  tracking_type: TrackingType
  current_weight_kg: number | null
  weight_step_kg: number
}

export type PlanEntry = {
  id: string
  position: number
  sets_min: number
  sets_max: number
  reps_min: number | null
  reps_max: number | null
  duration_min: number | null
  duration_max: number | null
  exercise: Exercise
  alternative: Exercise | null
}

export type LoggedSet = SetValues & { exercise_id: string; set_number: number }

export type DayData = {
  entries: PlanEntry[]
  workoutId: string | null
  todaySets: LoggedSet[]
  lastSets: LoggedSet[]
}

const EXERCISE_COLUMNS = 'id, name, tracking_type, current_weight_kg, weight_step_kg'

/** Legt beim ersten Login den Plan an und lädt danach die Trainingstage. */
export async function loadPlanDays(): Promise<PlanDay[]> {
  // Mehrfachaufruf ist sicher, die Funktion überschreibt keinen vorhandenen Plan.
  const { error: seedError } = await supabase.rpc('seed_default_plan')
  if (seedError) throw seedError

  const { data, error } = await supabase.from('plan_days').select('id, weekday, name').order('weekday')
  if (error) throw error
  return data
}

/** Tage im Zeitraum, an denen mindestens ein Satz gespeichert wurde. */
export async function loadTrainedDates(from: string, to: string): Promise<Set<string>> {
  // sets!inner lässt Workouts weg, deren Sätze alle wieder gelöscht wurden.
  const { data, error } = await supabase
    .from('workouts')
    .select('performed_on, sets!inner(id)')
    .gte('performed_on', from)
    .lte('performed_on', to)
    .limit(1, { foreignTable: 'sets' })
  if (error) throw error
  return new Set(data.map((workout) => workout.performed_on))
}

export async function loadDay(planDayId: string, today: string): Promise<DayData> {
  const [entries, workout, last] = await Promise.all([
    supabase
      .from('plan_exercises')
      .select(
        `id, position, sets_min, sets_max, reps_min, reps_max, duration_min, duration_max,
         exercise:exercises!plan_exercises_exercise_id_user_id_fkey(${EXERCISE_COLUMNS}),
         alternative:exercises!plan_exercises_alternative_exercise_id_user_id_fkey(${EXERCISE_COLUMNS})`,
      )
      .eq('plan_day_id', planDayId)
      .order('position'),
    supabase.from('workouts').select('id').eq('plan_day_id', planDayId).eq('performed_on', today).maybeSingle(),
    supabase.rpc('last_performance', { before_date: today }),
  ])
  if (entries.error) throw entries.error
  if (workout.error) throw workout.error
  if (last.error) throw last.error

  const workoutId = workout.data?.id ?? null
  let todaySets: LoggedSet[] = []
  if (workoutId) {
    const { data, error } = await supabase
      .from('sets')
      .select('exercise_id, set_number, weight_kg, reps, duration_seconds, is_assisted, next_weight_kg')
      .eq('workout_id', workoutId)
    if (error) throw error
    todaySets = data
  }

  return {
    // Die generierten Typen kennen weder die zusammengesetzten FKs noch die erlaubten tracking_type-Werte.
    entries: entries.data as unknown as PlanEntry[],
    workoutId,
    todaySets,
    lastSets: last.data as LoggedSet[],
  }
}

/** Holt das heutige Workout oder legt es an. Die Unique-Regel verhindert Duplikate. */
export async function ensureWorkout(planDayId: string, today: string): Promise<string> {
  const { data, error } = await supabase
    .from('workouts')
    .upsert({ plan_day_id: planDayId, performed_on: today }, { onConflict: 'plan_day_id,performed_on' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function saveSet(workoutId: string, exerciseId: string, setNumber: number, values: SetValues): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .upsert(
      { workout_id: workoutId, exercise_id: exerciseId, set_number: setNumber, ...values },
      { onConflict: 'workout_id,exercise_id,set_number' },
    )
  if (error) throw error
}

/** Speichert die Antwort auf „Geschafft?“ für jeden Satz der Übung. null nimmt die Antwort zurück. */
export async function updateNextWeights(
  workoutId: string,
  exerciseId: string,
  updates: { setNumber: number; nextWeight: number | null }[],
): Promise<void> {
  const results = await Promise.all(
    updates.map(({ setNumber, nextWeight }) =>
      supabase
        .from('sets')
        .update({ next_weight_kg: nextWeight })
        .eq('workout_id', workoutId)
        .eq('exercise_id', exerciseId)
        .eq('set_number', setNumber),
    ),
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
}

/** Löscht alle Sätze einer Übung in diesem Training. */
export async function deleteExerciseSets(workoutId: string, exerciseId: string): Promise<void> {
  const { error } = await supabase.from('sets').delete().eq('workout_id', workoutId).eq('exercise_id', exerciseId)
  if (error) throw error
}

export async function deleteSet(workoutId: string, exerciseId: string, setNumber: number): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .delete()
    .eq('workout_id', workoutId)
    .eq('exercise_id', exerciseId)
    .eq('set_number', setNumber)
  if (error) throw error
}

export async function updateExercise(
  exerciseId: string,
  changes: { current_weight_kg?: number | null; tracking_type?: TrackingType; weight_step_kg?: number },
): Promise<void> {
  const { error } = await supabase.from('exercises').update(changes).eq('id', exerciseId)
  if (error) throw error
}
