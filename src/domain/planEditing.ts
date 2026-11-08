import type { PlanDayDraft } from './trainingPlan'

export type PlanDraftError = { day: number; exercise?: number; message: string }

function validRange(min: number | null, max: number | null, limit: number, optional = false): boolean {
  if (optional && min === null && max === null) return true
  return min !== null && max !== null && Number.isInteger(min) && Number.isInteger(max) && min >= 1 && min <= max && max <= limit
}

/** Prüft auch die Übungsseiten, die beim Speichern gerade nicht geöffnet sind. */
export function validatePlanDraft(days: PlanDayDraft[]): PlanDraftError | null {
  if (days.length === 0) return { day: 0, message: 'Bitte mindestens einen Trainingstag anlegen.' }
  const weekdays = new Set<number>()
  for (const [day, item] of days.entries()) {
    if (item.name.trim().length < 1 || item.name.trim().length > 100) return { day, message: 'Bitte einen Tagesnamen mit 1–100 Zeichen eintragen.' }
    if (weekdays.has(item.weekday)) return { day, message: 'Jeder Wochentag darf nur einmal vorkommen.' }
    weekdays.add(item.weekday)
    if (item.exercises.length === 0) return { day, message: 'Bitte mindestens eine Übung hinzufügen.' }
    const names = new Set<string>()
    for (const [exercise, entry] of item.exercises.entries()) {
      const fail = (message: string): PlanDraftError => ({ day, exercise, message })
      const name = entry.name.trim()
      if (!name || name.length > 100) return fail('Bitte einen Übungsnamen mit 1–100 Zeichen eintragen.')
      if (names.has(name)) return fail('Jede Übung darf pro Tag nur einmal vorkommen.')
      names.add(name)
      if (!validRange(entry.sets_min, entry.sets_max, 100)) return fail('Sätze prüfen: 1–100, Minimum höchstens Maximum.')
      if (!validRange(entry.reps_min, entry.reps_max, 999, true)) return fail('Wiederholungen prüfen: beide Felder leer lassen oder 1–999 eintragen, Minimum höchstens Maximum.')
      if (!validRange(entry.duration_min, entry.duration_max, 86400, true)) return fail('Dauer prüfen: beide Felder leer lassen oder 1–86400 Sekunden eintragen, Minimum höchstens Maximum.')
    }
  }
  return null
}

/** Gespeicherte Sätze bleiben sichtbar, auch wenn die lokale Anzahl kleiner ist. */
export function trainingSetCount(preferred: number | null, savedNumbers: number[]): number {
  const count = preferred !== null && Number.isInteger(preferred) && preferred >= 1 && preferred <= 100 ? preferred : 3
  return Math.max(count, ...savedNumbers)
}
