// Gewichtsverlauf für die Statistik: Punkte für die Kurve und die Veränderung im Zeitraum.
import { shiftDate } from './week'

export type WeightPoint = { date: string; weightKg: number; x: number; y: number }
export type WeightTrend = {
  points: WeightPoint[]
  latestKg: number
  /** Veränderung vom ersten bis zum letzten Punkt im Zeitraum, null bei nur einem Punkt. */
  changeKg: number | null
  /** Ziellinie auf der y-Achse (0 oben, 1 unten), null ohne Zielgewicht. */
  targetY: number | null
}

function dayNumber(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86_400_000
}

/**
 * Gewichte der letzten `days` Tage bis heute. Gibt es darin keine Messung, zählt die letzte ältere.
 * x läuft nach Datum von 0 bis 1, y von 0 (schwerster Wert) bis 1 (leichtester), mit etwas Rand.
 * Das Zielgewicht gehört mit in den Bereich, damit die Ziellinie immer zu sehen ist.
 */
export function weightTrend(entries: { date: string; weightKg: number | null }[], today: string, targetKg: number | null, days = 90): WeightTrend | null {
  const weights = entries.filter((entry): entry is { date: string; weightKg: number } => entry.weightKg !== null && entry.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!weights.length) return null
  const from = shiftDate(today, -(days - 1))
  const inRange = weights.filter((entry) => entry.date >= from)
  const shown = inRange.length ? inRange : [weights[weights.length - 1]]

  const values = shown.map((entry) => entry.weightKg).concat(targetKg === null ? [] : [targetKg])
  const pad = Math.max(0.5, (Math.max(...values) - Math.min(...values)) * 0.1)
  const top = Math.max(...values) + pad
  const bottom = Math.min(...values) - pad
  const toY = (kg: number) => (top - kg) / (top - bottom)
  const start = dayNumber(shown[0].date)
  const span = dayNumber(shown[shown.length - 1].date) - start

  const latestKg = shown[shown.length - 1].weightKg
  return {
    points: shown.map((entry) => ({ ...entry, x: span === 0 ? 0.5 : (dayNumber(entry.date) - start) / span, y: toY(entry.weightKg) })),
    latestKg,
    changeKg: shown.length > 1 ? Math.round((latestKg - shown[0].weightKg) * 10) / 10 : null,
    targetY: targetKg === null ? null : toY(targetKg),
  }
}
