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
