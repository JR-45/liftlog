import type { PlanDayDraft } from './trainingPlan'

export function copyTemplateDay(day: PlanDayDraft, weekday: number): PlanDayDraft {
  return { ...day, weekday, exercises: day.exercises.map((exercise) => ({ ...exercise })) }
}

/** Ein Popup verändert nur seinen Wochentag; null markiert ihn in der Vorlage als Ruhetag. */
export function replaceTemplateDay(days: PlanDayDraft[], weekday: number, replacement: PlanDayDraft | null): PlanDayDraft[] {
  const next = days.filter((day) => day.weekday !== weekday)
  if (replacement) next.push(copyTemplateDay(replacement, weekday))
  return next.sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))
}
