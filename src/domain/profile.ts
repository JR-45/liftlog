import type { ExportRow } from './export'
import { mondayOf, weekStreak } from './motivation'

export type PersonalRecord = {
  name: string
  maxWeightKg: number | null
  bestSetReps: number
  estimated1RmKg: number | null
  maxRepsOnly: number | null
  date: string
}

export type AthleteStats = {
  thisWeekWorkouts: number
  weekProgress: number
  activeWeeksStreak: number
  personalRecords: PersonalRecord[]
}

/** Geschätztes 1RM nach Epley-Formel: Gewicht × (1 + Wdh. / 30). */
function estimate1Rm(weightKg: number, reps: number): number {
  const cappedReps = Math.min(Math.max(reps, 1), 15)
  const raw = cappedReps === 1 ? weightKg : weightKg * (1 + cappedReps / 30)
  return Math.round(raw * 10) / 10
}

/**
 * Berechnet Wochenziel, Wochenserie und persönliche Rekorde (PRs).
 */
export function computeAthleteStats(rows: ExportRow[], today: string, weeklyGoal: number): AthleteStats {
  const workoutDates = new Set<string>()
  const currentMonday = mondayOf(today)
  const thisWeekDates = new Set<string>()

  const prMap = new Map<string, PersonalRecord>()

  for (const row of rows) {
    workoutDates.add(row.performed_on)
    if (mondayOf(row.performed_on) === currentMonday) {
      thisWeekDates.add(row.performed_on)
    }

    if (!row.is_assisted && row.weight_kg !== null && row.weight_kg > 0 && row.reps !== null && row.reps > 0) {
      const oneRm = estimate1Rm(row.weight_kg, row.reps)
      const existing = prMap.get(row.exercise)
      if (!existing) {
        prMap.set(row.exercise, {
          name: row.exercise,
          maxWeightKg: row.weight_kg,
          bestSetReps: row.reps,
          estimated1RmKg: oneRm,
          maxRepsOnly: null,
          date: row.performed_on,
        })
      } else {
        const currentMax = existing.maxWeightKg ?? 0
        const isHeavier =
          row.weight_kg > currentMax || (row.weight_kg === currentMax && row.reps > existing.bestSetReps)
        const best1Rm = Math.max(existing.estimated1RmKg ?? 0, oneRm)
        prMap.set(row.exercise, {
          name: row.exercise,
          maxWeightKg: isHeavier ? row.weight_kg : existing.maxWeightKg,
          bestSetReps: isHeavier ? row.reps : existing.bestSetReps,
          estimated1RmKg: best1Rm,
          maxRepsOnly: null,
          date: isHeavier ? row.performed_on : existing.date,
        })
      }
    } else if (!row.is_assisted && row.weight_kg === null && row.reps !== null && row.reps > 0) {
      const existing = prMap.get(row.exercise)
      if (!existing) {
        prMap.set(row.exercise, {
          name: row.exercise,
          maxWeightKg: null,
          bestSetReps: row.reps,
          estimated1RmKg: null,
          maxRepsOnly: row.reps,
          date: row.performed_on,
        })
      } else if (existing.maxWeightKg === null && row.reps > (existing.maxRepsOnly ?? 0)) {
        prMap.set(row.exercise, {
          ...existing,
          bestSetReps: row.reps,
          maxRepsOnly: row.reps,
          date: row.performed_on,
        })
      }
    }
  }

  const personalRecords = [...prMap.values()].sort((a, b) => {
    const scoreA = a.estimated1RmKg ?? (a.maxRepsOnly ?? 0) * 0.5
    const scoreB = b.estimated1RmKg ?? (b.maxRepsOnly ?? 0) * 0.5
    return scoreB - scoreA
  })

  const thisWeekWorkouts = thisWeekDates.size
  return {
    thisWeekWorkouts,
    weekProgress: weeklyGoal > 0 ? Math.min(1, thisWeekWorkouts / weeklyGoal) : 0,
    // Gleiche Berechnung wie die Flamme auf der Trainingsseite.
    activeWeeksStreak: weekStreak(workoutDates, today),
    personalRecords,
  }
}
