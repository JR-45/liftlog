import { describe, expect, it } from 'vitest'
import { buildWeek, planForDate, shiftDate, weekStart } from './week'
import { buildMonth } from './calendar'

describe('Kalenderwochen', () => {
  it('beginnt am Montag, auch bei Sonntag und Jahreswechsel', () => {
    expect(weekStart('2026-11-08')).toBe('2026-11-02')
    expect(weekStart('2027-01-01')).toBe('2026-12-28')
    expect(weekStart('2026-11-02')).toBe('2026-11-02')
  })
  it('verschiebt Kalendertage auch über Sommerzeit und Schaltjahre', () => {
    expect(shiftDate('2026-03-28', 2)).toBe('2026-03-30')
    expect(shiftDate('2026-10-24', 2)).toBe('2026-10-26')
    expect(shiftDate('2028-02-28', 1)).toBe('2028-02-29')
  })
  it('übernimmt die Vorlage und gibt datierten Entscheidungen Vorrang', () => {
    const days = buildWeek('2026-11-02', [{ id: 'a', weekday: 1 }, { id: 'b', weekday: 3 }], [
      { day_date: '2026-11-02', plan_day_id: null, is_rest_day: true },
      { day_date: '2026-11-03', plan_day_id: 'a', is_rest_day: false },
      { day_date: '2026-11-04', plan_day_id: null, is_rest_day: false },
    ])
    expect(days).toHaveLength(7)
    expect(days[0]).toMatchObject({ plan_day_id: null, is_rest_day: true })
    expect(days[1]).toMatchObject({ plan_day_id: 'a', is_rest_day: false })
    expect(days[2]).toMatchObject({ plan_day_id: null, is_rest_day: false })
    expect(days[6].day_date).toBe('2026-11-08')
  })
  it('verändert weder Vorlage noch eine andere Woche', () => {
    const template = [{ id: 'a', weekday: 1 }]
    const first = buildWeek('2026-11-02', template, [])
    first[0].plan_day_id = null
    expect(buildWeek('2026-11-09', template, [])[0].plan_day_id).toBe('a')
    expect(template[0].weekday).toBe(1)
  })
  it('berücksichtigt Ruhetage und verschobene Einheiten in der Statistik', () => {
    const result = buildMonth({
      year: 2026, month: 10, today: '2026-11-07', startDate: '2026-11-01',
      plannedWeekdays: new Set([1]), trainedDates: new Set<string>(),
      plannedDates: new Map([['2026-11-02', false], ['2026-11-03', true]]),
    })
    expect(result.weeks.flat().find((day) => day?.date === '2026-11-02')?.status).toBe('rest')
    expect(result.weeks.flat().find((day) => day?.date === '2026-11-03')?.status).toBe('missed')
    expect(result.missed).toBe(1)
  })
  it('bietet Kalendermarkierungen an verschobenen Trainingstagen statt an Ruhetagen an', () => {
    const result = buildMonth({
      year: 2026, month: 10, today: '2026-11-09', startDate: '2026-11-01',
      plannedWeekdays: new Set([1]), trainedDates: new Set<string>(),
      plannedDates: new Map([['2026-11-09', false], ['2026-11-10', true]]),
    })
    expect(result.weeks.flat().find((day) => day?.date === '2026-11-09')?.canMark).toBe(false)
    expect(result.weeks.flat().find((day) => day?.date === '2026-11-10')?.canMark).toBe(true)
  })
  it('behält Krank-, Urlaubs- und Verschoben-Markierungen neben der Wochenplanung bei', () => {
    const result = buildMonth({
      year: 2026, month: 10, today: '2026-11-07', startDate: '2026-11-01',
      plannedWeekdays: new Set([1]), trainedDates: new Set<string>(),
      plannedDates: new Map([['2026-11-03', true]]), marks: new Map([['2026-11-03', 'sick']]),
    })
    expect(result.weeks.flat().find((day) => day?.date === '2026-11-03')?.status).toBe('marked')
    expect(result.marked).toBe(1)
  })
})

describe('planForDate', () => {
  // 2026-11-09 ist ein Montag, 2026-11-12 ein Donnerstag.
  const template = [{ id: 'push', weekday: 1 }, { id: 'pull', weekday: 2 }]

  it('nimmt ohne Wochenplanung die Vorlage', () => {
    expect(planForDate('2026-11-09', template, [])).toEqual({ planDayId: 'push', kind: 'plan' })
    expect(planForDate('2026-11-12', template, [])).toEqual({ planDayId: null, kind: 'rest' })
  })

  it('lässt die Wochenplanung gewinnen', () => {
    const overrides = [
      { day_date: '2026-11-09', plan_day_id: null, is_rest_day: true },
      { day_date: '2026-11-12', plan_day_id: 'push', is_rest_day: false },
    ]
    expect(planForDate('2026-11-09', template, overrides)).toEqual({ planDayId: null, kind: 'rest' })
    expect(planForDate('2026-11-12', template, overrides)).toEqual({ planDayId: 'push', kind: 'plan' })
  })

  it('kennt ungeplante Tage', () => {
    const overrides = [{ day_date: '2026-11-10', plan_day_id: null, is_rest_day: false }]
    expect(planForDate('2026-11-10', template, overrides)).toEqual({ planDayId: null, kind: 'unplanned' })
  })

  it('betrifft nur das geplante Datum, nicht denselben Wochentag eine Woche später', () => {
    const overrides = [{ day_date: '2026-11-09', plan_day_id: null, is_rest_day: true }]
    expect(planForDate('2026-11-16', template, overrides)).toEqual({ planDayId: 'push', kind: 'plan' })
  })
})
