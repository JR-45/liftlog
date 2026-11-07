import type { ExportRow } from './export'
import { localDateString } from './sets'

export type PersonalRecord = {
  name: string
  maxWeightKg: number | null
  bestSetReps: number
  estimated1RmKg: number | null
  maxRepsOnly: number | null
  date: string
}

export type AthleteStats = {
  totalWorkouts: number
  totalSets: number
  totalVolumeKg: number
  thisWeekWorkouts: number
  weekProgress: number
  activeWeeksStreak: number
  personalRecords: PersonalRecord[]
}

/** Montag der ISO-Woche eines Datums als YYYY-MM-DD. */
function mondayOfWeek(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  const day = date.getDay()
  // Sonntag (0) gehört in Deutschland zur laufenden Woche (6 Tage nach Montag).
  const offset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + offset)
  return localDateString(date)
}

/** Vorheriger Montag (7 Tage zurück) als YYYY-MM-DD. */
function previousMonday(mondayStr: string): string {
  const date = new Date(`${mondayStr}T12:00:00`)
  date.setDate(date.getDate() - 7)
  return localDateString(date)
}

/** Geschätztes 1RM nach Epley-Formel: Gewicht × (1 + Wdh. / 30). */
function estimate1Rm(weightKg: number, reps: number): number {
  const cappedReps = Math.min(Math.max(reps, 1), 15)
  const raw = cappedReps === 1 ? weightKg : weightKg * (1 + cappedReps / 30)
  return Math.round(raw * 10) / 10
}

/**
 * Berechnet die lebenslangen Athleten-Statistiken, Wochenserie und persönlichen Rekorde (PRs).
 */
export function computeAthleteStats(rows: ExportRow[], today: string, weeklyGoal: number): AthleteStats {
  const workoutDates = new Set<string>()
  const activeMondays = new Set<string>()
  const currentMonday = mondayOfWeek(today)
  const thisWeekDates = new Set<string>()
  let totalVolumeKg = 0

  const prMap = new Map<string, PersonalRecord>()

  for (const row of rows) {
    workoutDates.add(row.performed_on)
    const weekStart = mondayOfWeek(row.performed_on)
    activeMondays.add(weekStart)
    if (weekStart === currentMonday) {
      thisWeekDates.add(row.performed_on)
    }

    if (!row.is_assisted && row.weight_kg !== null && row.weight_kg > 0 && row.reps !== null && row.reps > 0) {
      totalVolumeKg += row.weight_kg * row.reps
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

  // Aktive Wochen-Serie zählen (startet in dieser Woche oder in der Vorwoche, falls diese Woche noch offen ist).
  let streak = 0
  let cursor = activeMondays.has(currentMonday) ? currentMonday : previousMonday(currentMonday)
  while (activeMondays.has(cursor)) {
    streak += 1
    cursor = previousMonday(cursor)
  }

  const personalRecords = [...prMap.values()].sort((a, b) => {
    const scoreA = a.estimated1RmKg ?? (a.maxRepsOnly ?? 0) * 0.5
    const scoreB = b.estimated1RmKg ?? (b.maxRepsOnly ?? 0) * 0.5
    return scoreB - scoreA
  })

  const thisWeekWorkouts = thisWeekDates.size
  return {
    totalWorkouts: workoutDates.size,
    totalSets: rows.length,
    totalVolumeKg: Math.round(totalVolumeKg),
    thisWeekWorkouts,
    weekProgress: weeklyGoal > 0 ? Math.min(1, thisWeekWorkouts / weeklyGoal) : 0,
    activeWeeksStreak: streak,
    personalRecords,
  }
}

/** Formatiert das bewegte Gesamtvolumen als kg oder Tonnen (t). */
export function formatVolume(volumeKg: number): string {
  if (volumeKg >= 1000) {
    const tonnes = Math.round((volumeKg / 1000) * 10) / 10
    return `${String(tonnes).replace('.', ',')} t`
  }
  return `${Math.round(volumeKg)} kg`
}
