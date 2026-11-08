import { localDateString } from './sets'

export type ScheduledDay = { day_date: string; plan_day_id: string | null; is_rest_day: boolean }

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return localDateString(value)
}

export function weekStart(date: string): string {
  const weekday = new Date(`${date}T12:00:00`).getDay()
  return shiftDate(date, -((weekday + 6) % 7))
}

/** Jede Woche beginnt mit der Vorlage; datierte Entscheidungen überschreiben nur ihren eigenen Tag. */
export function buildWeek(start: string, template: { id: string; weekday: number }[], overrides: ScheduledDay[]): ScheduledDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day_date = shiftDate(start, index)
    const existing = overrides.find((item) => item.day_date === day_date)
    if (existing) return { ...existing }
    const plan = template.find((item) => item.weekday === new Date(`${day_date}T12:00:00`).getDay())
    return { day_date, plan_day_id: plan?.id ?? null, is_rest_day: !plan }
  })
}

export type DayPlan = { planDayId: string | null; kind: 'plan' | 'rest' | 'unplanned' }

/**
 * Was an einem Datum dran ist. Die Wochenplanung gewinnt, sonst gilt die Vorlage für den Wochentag.
 * „Ungeplant“ aus der Wochenplanung heißt: kein Training eingeplant, aber auch kein bewusster Ruhetag.
 */
export function planForDate(date: string, template: { id: string; weekday: number }[], overrides: ScheduledDay[]): DayPlan {
  const override = overrides.find((item) => item.day_date === date)
  if (override) {
    if (override.plan_day_id) return { planDayId: override.plan_day_id, kind: 'plan' }
    return { planDayId: null, kind: override.is_rest_day ? 'rest' : 'unplanned' }
  }
  const plan = template.find((item) => item.weekday === new Date(`${date}T12:00:00`).getDay())
  return plan ? { planDayId: plan.id, kind: 'plan' } : { planDayId: null, kind: 'rest' }
}
