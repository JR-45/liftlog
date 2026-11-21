import { describe, expect, it } from 'vitest'
import { formatDose, normalizeWeekdays, parseDose, scheduleLabel, supplementDue, supplementStreak } from './supplements'

describe('formatDose', () => {
  it('setzt Zahl und Einheit zusammen', () => {
    expect(formatDose('5', 'g')).toBe('5 g')
    expect(formatDose('2', 'Stück')).toBe('2 Stück')
    expect(formatDose('1', 'Stück')).toBe('1 Stück')
    expect(formatDose('2,5', 'mg')).toBe('2,5 mg')
  })

  it('gibt bei leer oder ungültig null', () => {
    expect(formatDose('', 'g')).toBeNull()
    expect(formatDose('0', 'g')).toBeNull()
    expect(formatDose('abc', 'g')).toBeNull()
  })
})

describe('parseDose', () => {
  it('liest gespeicherte Mengen zurück', () => {
    expect(parseDose('5 g')).toEqual({ amount: '5', unit: 'g' })
    expect(parseDose('2 Stück')).toEqual({ amount: '2', unit: 'Stück' })
    // Alte Einträge mit Tabletten oder Kapseln werden zu Stück.
    expect(parseDose('1 Tablette')).toEqual({ amount: '1', unit: 'Stück' })
    expect(parseDose('2 Kapseln')).toEqual({ amount: '2', unit: 'Stück' })
    expect(parseDose('200 µg')).toEqual({ amount: '200', unit: 'µg' })
  })

  it('lässt alten Freitext ohne Einheit leer', () => {
    expect(parseDose('eine Messerspitze')).toEqual({ amount: '', unit: null })
    expect(parseDose(null)).toEqual({ amount: '', unit: null })
  })
})

describe('Wochentage', () => {
  it('speichert alle Tage als täglich', () => {
    expect(normalizeWeekdays([0, 1, 2, 3, 4, 5, 6])).toBeNull()
    expect(normalizeWeekdays([])).toBeNull()
    expect(normalizeWeekdays([4, 1, 1])).toEqual([1, 4])
  })

  it('zeigt ein Supplement nur an seinen Tagen', () => {
    // 2026-11-09 ist ein Montag.
    expect(supplementDue([1], '2026-11-09')).toBe(true)
    expect(supplementDue([1], '2026-11-10')).toBe(false)
    expect(supplementDue(null, '2026-11-10')).toBe(true)
  })

  it('beschriftet die Tage ab Montag', () => {
    expect(scheduleLabel(null)).toBeNull()
    expect(scheduleLabel([0, 1, 4])).toBe('Mo, Do, So')
  })
})

describe('supplementStreak', () => {
  const today = '2026-11-21' // Samstag
  const daily = { id: 'k', weekdays: null, startDate: '2026-11-01' }
  const taken = (entries: Record<string, string[]>) => new Map(Object.entries(entries).map(([date, ids]) => [date, new Set(ids)]))

  it('zählt Tage am Stück mit allem genommen', () => {
    expect(supplementStreak([daily], taken({ '2026-11-21': ['k'], '2026-11-20': ['k'], '2026-11-19': ['k'], '2026-11-17': ['k'] }), today)).toBe(3)
  })

  it('bricht nicht, solange heute noch offen ist', () => {
    expect(supplementStreak([daily], taken({ '2026-11-20': ['k'], '2026-11-19': ['k'] }), today)).toBe(2)
  })

  it('braucht alle fälligen Supplemente eines Tages', () => {
    const iron = { id: 'e', weekdays: null, startDate: '2026-11-01' }
    expect(supplementStreak([daily, iron], taken({ '2026-11-21': ['k', 'e'], '2026-11-20': ['k'] }), today)).toBe(1)
  })

  it('überspringt Tage, an denen nichts dran ist', () => {
    const mondayThursday = { id: 'o', weekdays: [1, 4], startDate: '2026-11-01' }
    // Do 19.11. und Mo 16.11. genommen, dazwischen nichts fällig.
    expect(supplementStreak([mondayThursday], taken({ '2026-11-19': ['o'], '2026-11-16': ['o'] }), today)).toBe(2)
  })

  it('zählt ein neues Supplement erst ab seinem Start', () => {
    const fresh = { id: 'n', weekdays: null, startDate: '2026-11-20' }
    expect(supplementStreak([daily, fresh], taken({ '2026-11-20': ['k', 'n'], '2026-11-19': ['k'] }), today)).toBe(2)
  })

  it('ist 0 ohne Supplemente', () => {
    expect(supplementStreak([], new Map(), today)).toBe(0)
  })
})
