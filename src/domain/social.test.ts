import { describe, expect, it } from 'vitest'
import { gymWeeks, socialSearchPattern } from './social'

describe('socialSearchPattern', () => {
  it('verlangt mindestens zwei Zeichen und höchstens 50', () => {
    expect(socialSearchPattern(' A ')).toBeNull()
    expect(socialSearchPattern('')).toBeNull()
    expect(socialSearchPattern('a'.repeat(51))).toBeNull()
  })
  it('sucht nach dem getrimmten Namen unabhängig von Großschreibung', () => {
    expect(socialSearchPattern('  Lara  ')).toBe('%Lara%')
  })
  it('behandelt SQL-Platzhalter und Backslashes als normale Namenszeichen', () => {
    expect(socialSearchPattern('a%b_c\\d')).toBe('%a\\%b\\_c\\\\d%')
  })
})

describe('gymWeeks', () => {
  it('zeigt die letzten Wochen Mo–So mit den Trainingstagen', () => {
    // 2026-11-08 ist ein Sonntag.
    const weeks = gymWeeks(['2026-11-02', '2026-11-04', '2026-10-27'], '2026-11-08', 2)
    expect(weeks.map((week) => week[0].date)).toEqual(['2026-10-26', '2026-11-02'])
    expect(weeks[1].filter((day) => day.trained).map((day) => day.date)).toEqual(['2026-11-02', '2026-11-04'])
    expect(weeks[0][1]).toEqual({ date: '2026-10-27', trained: true, future: false })
  })

  it('markiert Tage nach heute als Zukunft', () => {
    const week = gymWeeks([], '2026-11-04', 1)[0]
    expect(week.filter((day) => day.future).map((day) => day.date)).toEqual(['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
  })
})
