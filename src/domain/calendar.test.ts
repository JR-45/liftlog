import { describe, expect, it } from 'vitest'
import { buildMonth, type CalendarMonth, monthIndex } from './calendar'

// November 2026: Der 1. ist ein Sonntag, der 7. ein Samstag.
const base = {
  year: 2026,
  month: 10,
  today: '2026-11-07',
  startDate: '2026-11-01',
  trainedDates: new Set<string>(),
  plannedWeekdays: new Set([0, 1, 3, 4, 5]),
}

function status(month: CalendarMonth, day: number) {
  return month.weeks.flat().find((cell) => cell?.day === day)?.status
}

describe('buildMonth', () => {
  it('beginnt die Woche am Montag und füllt Lücken', () => {
    const { weeks } = buildMonth(base)
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(weeks[0][6]?.day).toBe(1)
    expect(weeks.at(-1)?.[0]?.day).toBe(30)
    expect(weeks.at(-1)?.slice(1)).toEqual([null, null, null, null, null, null])
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it('kennt Monatslängen und Schaltjahre', () => {
    const days = (year: number, month: number) => buildMonth({ ...base, year, month }).weeks.flat().filter(Boolean).length
    expect(days(2026, 10)).toBe(30)
    expect(days(2026, 11)).toBe(31)
    expect(days(2026, 1)).toBe(28)
    expect(days(2028, 1)).toBe(29)
  })

  it('markiert Tage mit Training', () => {
    const month = buildMonth({ ...base, trainedDates: new Set(['2026-11-02']) })
    expect(status(month, 2)).toBe('trained')
  })

  it('markiert vergangene Trainingstage ohne Training als verpasst', () => {
    expect(status(buildMonth(base), 2)).toBe('missed')
  })

  it('zählt vergangene Ruhetage nicht als verpasst', () => {
    expect(status(buildMonth(base), 3)).toBe('rest')
  })

  it('zählt ein Training am Ruhetag', () => {
    expect(status(buildMonth({ ...base, trainedDates: new Set(['2026-11-03']) }), 3)).toBe('trained')
  })

  it('verpasst heute noch nichts', () => {
    const month = buildMonth({ ...base, today: '2026-11-05' })
    expect(status(month, 5)).toBe('today')
    expect(month.missed).toBe(3)
  })

  it('zeigt ein Training von heute als geschafft', () => {
    expect(status(buildMonth({ ...base, trainedDates: new Set(['2026-11-07']) }), 7)).toBe('trained')
  })

  it('markiert die Zukunft nicht', () => {
    expect(status(buildMonth(base), 8)).toBe('future')
  })

  it('zählt nichts vor dem Start als verpasst', () => {
    const month = buildMonth({ ...base, startDate: '2026-11-05' })
    expect(status(month, 4)).toBe('before_start')
    expect(status(month, 5)).toBe('missed')
  })

  it('zählt Trainings und verpasste Tage', () => {
    const month = buildMonth({ ...base, trainedDates: new Set(['2026-11-02', '2026-11-03']) })
    // Trainiert: 2. und 3. Verpasst: 1., 4., 5., 6. Der 7. ist heute.
    expect(month.trained).toBe(2)
    expect(month.missed).toBe(4)
  })
})

describe('monthIndex', () => {
  it('zählt über den Jahreswechsel hinweg', () => {
    expect(monthIndex('2027-01-15') - monthIndex('2026-12-31')).toBe(1)
  })
})
