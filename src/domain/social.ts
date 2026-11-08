import { mondayOf } from './motivation'
import { shiftDate } from './week'
/** Behandelt Platzhalter als Namenszeichen, damit die Suche nicht alle Konten auswählt. */
export function socialSearchPattern(input: string): string | null {
  const name = input.trim()
  if (name.length < 2 || name.length > 50) return null
  return `%${name.replace(/[\\%_]/g, '\\$&')}%`
}

export type GymDay = { date: string; trained: boolean; future: boolean }

/**
 * Die letzten Wochen als Raster Mo–So für die Gym-Tage auf fremden Profilen, älteste Woche zuerst.
 * Nur Datum und ob trainiert wurde, keine Inhalte.
 */
export function gymWeeks(trainedDates: Iterable<string>, today: string, weeks = 4): GymDay[][] {
  const trained = new Set(trainedDates)
  const start = shiftDate(mondayOf(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, week) => Array.from({ length: 7 }, (_, day) => {
    const date = shiftDate(start, week * 7 + day)
    return { date, trained: trained.has(date), future: date > today }
  }))
}
