import { describe, expect, it } from 'vitest'
import { formatClock, restFraction, restSecondsLeft } from './timer'

describe('restSecondsLeft', () => {
  it('rundet angebrochene Sekunden auf', () => {
    expect(restSecondsLeft(10_000, 8_500)).toBe(2)
  })

  it('ist genau am Ende 0', () => {
    expect(restSecondsLeft(10_000, 10_000)).toBe(0)
  })

  it('wird bei Überziehung negativ', () => {
    expect(restSecondsLeft(10_000, 22_000)).toBe(-12)
  })
})

describe('restFraction', () => {
  it('zeigt den verbleibenden Anteil', () => {
    expect(restFraction(90_000, 90_000, 45_000)).toBe(0.5)
  })

  it('bleibt zwischen 0 und 1', () => {
    expect(restFraction(90_000, 90_000, -5_000)).toBe(1)
    expect(restFraction(90_000, 90_000, 100_000)).toBe(0)
  })

  it('verkraftet eine Gesamtzeit von 0', () => {
    expect(restFraction(0, 0, 0)).toBe(0)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [60, '1:00'],
    [75, '1:15'],
    [-12, '0:12'],
  ])('formatiert %i als %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected)
  })
})
