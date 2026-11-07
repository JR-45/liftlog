import type { ExportRow } from '../../domain/export'
import { supabase } from '../../lib/supabase'

const PAGE_SIZE = 1000

type ExportQueryRow = {
  set_number: number
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  is_assisted: boolean
  exercise: { name: string }
  workout: { performed_on: string; plan_day: { name: string } | null }
}

/** Lädt alle eigenen Sätze. Die API liefert höchstens 1000 Zeilen pro Abfrage, deshalb seitenweise. */
export async function loadExportRows(): Promise<ExportRow[]> {
  const rows: ExportRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('sets')
      .select(
        `set_number, weight_kg, reps, duration_seconds, is_assisted,
         exercise:exercises!sets_exercise_id_user_id_fkey(name),
         workout:workouts!sets_workout_id_user_id_fkey(performed_on, plan_day:plan_days!workouts_plan_day_id_user_id_fkey(name))`,
      )
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error

    // Die generierten Typen kennen die zusammengesetzten FKs nicht.
    const page = data as unknown as ExportQueryRow[]
    for (const row of page) {
      rows.push({
        performed_on: row.workout.performed_on,
        plan_day: row.workout.plan_day?.name ?? null,
        exercise: row.exercise.name,
        set_number: row.set_number,
        weight_kg: row.weight_kg,
        is_assisted: row.is_assisted,
        reps: row.reps,
        duration_seconds: row.duration_seconds,
      })
    }
    if (page.length < PAGE_SIZE) return rows
  }
}
