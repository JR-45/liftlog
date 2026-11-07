// Reine Logik für Hero-Karte und Streak. Ohne React und Datenbank.

/** Montag der Woche eines Datums (YYYY-MM-DD), in lokaler Zeit. */
function mondayOf(date: string): string {
  const value = new Date(`${date}T12:00:00`)
  const offset = (value.getDay() + 6) % 7
  value.setDate(value.getDate() - offset)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

function previousMonday(monday: string): string {
  const value = new Date(`${monday}T12:00:00`)
  value.setDate(value.getDate() - 7)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

/**
 * Wochen am Stück mit mindestens einem Training. Die laufende Woche zählt mit, sobald trainiert
 * wurde. Ist sie noch leer, ist die Serie nicht gerissen und zählt ab der Vorwoche.
 */
export function weekStreak(trainedDates: Iterable<string>, today: string): number {
  const weeks = new Set([...trainedDates].map(mondayOf))
  let cursor = mondayOf(today)
  if (!weeks.has(cursor)) cursor = previousMonday(cursor)
  let streak = 0
  while (weeks.has(cursor)) {
    streak += 1
    cursor = previousMonday(cursor)
  }
  return streak
}

/**
 * Geschätzte Dauer in Minuten, auf 5 gerundet: pro Satz etwa 45 s Arbeit und die Pause.
 * Mindestens 5 Minuten, damit kurze Tage nicht „0 Min.“ zeigen.
 */
export function estimateMinutes(totalSets: number, restSeconds: number): number {
  const minutes = (totalSets * (45 + restSeconds)) / 60
  return Math.max(5, Math.round(minutes / 5) * 5)
}
