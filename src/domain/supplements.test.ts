import { describe, expect, it } from 'vitest'
import { formatDose, normalizeWeekdays, parseDose, scheduleLabel, supplementDue } from './supplements'

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
