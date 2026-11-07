import { localDateString } from './sets'

export type DayStatus = 'trained' | 'missed' | 'marked' | 'rest' | 'today' | 'future' | 'before_start'
export type DayMarkKind = 'sick' | 'vacation' | 'moved'

export type CalendarDay = {
  date: string
  day: number
  status: DayStatus
  mark: DayMarkKind | null
  /** Trainingstage ohne Training lassen sich markieren, auch im Voraus. */
  canMark: boolean
}

export type CalendarMonth = {
  /** Wochen von Montag bis Sonntag. null füllt die Lücken vor dem 1. und nach dem letzten Tag. */
  weeks: (CalendarDay | null)[][]
  trained: number
  missed: number
  marked: number
}

type Input = {
  year: number
  /** 0 = Januar */
  month: number
  today: string
  startDate: string
  trainedDates: ReadonlySet<string>
  plannedWeekdays: ReadonlySet<number>
  marks?: ReadonlyMap<string, DayMarkKind>
}

function statusOf(date: string, weekday: number, input: Input): DayStatus {
  // Ein Training zählt immer, auch an einem Ruhetag oder vor dem Start.
  if (input.trainedDates.has(date)) return 'trained'
  if (input.marks?.has(date)) return 'marked'
  if (date > input.today) return 'future'
  // Heute ist noch nichts verpasst.
  if (date === input.today) return 'today'
  if (date < input.startDate) return 'before_start'
  return input.plannedWeekdays.has(weekday) ? 'missed' : 'rest'
}

export function buildMonth(input: Input): CalendarMonth {
  const { year, month } = input
  const dayCount = new Date(year, month + 1, 0).getDate()
  // getDay: 0 = Sonntag. Die Wochen beginnen aber am Montag.
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7

  const cells: (CalendarDay | null)[] = Array.from({ length: leadingBlanks }, () => null)
  let trained = 0
  let missed = 0
  let marked = 0
  for (let day = 1; day <= dayCount; day += 1) {
    const value = new Date(year, month, day)
    const date = localDateString(value)
    const status = statusOf(date, value.getDay(), input)
    if (status === 'trained') trained += 1
    if (status === 'missed') missed += 1
    if (status === 'marked') marked += 1
    const planned = input.plannedWeekdays.has(value.getDay())
    const canMark =
      status === 'missed' || status === 'marked' || ((status === 'today' || status === 'future') && planned)
    cells.push({ date, day, status, mark: status === 'marked' ? (input.marks?.get(date) ?? null) : null, canMark })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (CalendarDay | null)[][] = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return { weeks, trained, missed, marked }
}

/** Monat als Zahl, damit sich Monate leicht vergleichen und verschieben lassen. */
export function monthIndex(date: string): number {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1
}
