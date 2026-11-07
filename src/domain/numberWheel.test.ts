import { describe, expect, it } from 'vitest'
import { numberWheelDigits, numberWheelValue, timeWheelParts, timeWheelSeconds } from './numberWheel'

describe('Zahlenauswahlrad', () => {
  it('übernimmt Dezimalkomma und führende Nullen', () => {
    expect(numberWheelDigits('12,5', 4, 2)).toEqual([0, 0, 1, 2, 5, 0])
    expect(numberWheelValue([0, 0, 1, 2, 5, 0], 2)).toBe('12.5')
  })
  it('rundet Nachkommastellen mit Übertrag', () => {
    expect(numberWheelDigits('9.999', 3, 2)).toEqual([0, 1, 0, 0, 0])
    expect(numberWheelValue([0, 0, 0], 0)).toBe('0')
  })
  it('verhindert Überlauf und ungültige Ziffern', () => {
    expect(numberWheelDigits('9999.999', 4, 2)).toEqual([9, 9, 9, 9, 9, 9])
    expect(numberWheelDigits('NaN', 2, 0)).toEqual([0, 0])
  })
  it('wählt Stunden und Minuten als ganze Zahlen', () => {
    expect(timeWheelParts(5400)).toEqual({ hours: 1, minutes: 30 })
    expect(timeWheelSeconds(1, 30)).toBe(5400)
    expect(timeWheelParts(30)).toEqual({ hours: 0, minutes: 1 })
    expect(timeWheelSeconds(0, 0)).toBeNull()
    expect(timeWheelSeconds(24, 1)).toBeNull()
    expect(timeWheelSeconds(1.5, 0)).toBeNull()
    expect(timeWheelSeconds(0, 60)).toBeNull()
  })
})
