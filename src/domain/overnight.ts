/** So lange nach dem Start darf ein Training von gestern nach Mitternacht weiterlaufen. */
export const OVERNIGHT_HOURS = 6

/**
 * Ob ein Training von gestern nach Mitternacht weiter als „heute“ gilt:
 * gestartet, noch nicht beendet und vor höchstens OVERNIGHT_HOURS begonnen.
 */
export function continuesOvernight(
  workout: { started_at: string | null; finished_at: string | null },
  now: Date = new Date(),
): boolean {
  if (!workout.started_at || workout.finished_at) return false
  const elapsed = now.getTime() - new Date(workout.started_at).getTime()
  return elapsed >= 0 && elapsed <= OVERNIGHT_HOURS * 60 * 60 * 1000
}
