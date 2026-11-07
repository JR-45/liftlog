import { describe, expect, it } from 'vitest'
import { estimateMinutes, weekStreak } from './motivation'

describe('weekStreak', () => {
  // 2026-11-07 ist ein Samstag, die Woche beginnt am Montag, 2026-11-02.
  const today = '2026-11-07'

  it('zählt Wochen am Stück inklusive der laufenden', () => {
    expect(weekStreak(['2026-11-03', '2026-10-28', '2026-10-20'], today)).toBe(3)
  })

  it('reißt nicht, solange die laufende Woche noch leer ist', () => {
    expect(weekStreak(['2026-10-28', '2026-10-20'], today)).toBe(2)
  })

  it('reißt bei einer Woche ohne Training', () => {
    expect(weekStreak(['2026-11-03', '2026-10-20'], today)).toBe(1)
  })

  it('ist 0 ohne Training in dieser und letzter Woche', () => {
    expect(weekStreak(['2026-10-14'], today)).toBe(0)
    expect(weekStreak([], today)).toBe(0)
  })

  it('zählt den Sonntag zur Woche davor', () => {
    expect(weekStreak(['2026-11-08'], '2026-11-08')).toBe(1)
    expect(weekStreak(['2026-11-01', '2026-11-02'], '2026-11-02')).toBe(2)
  })
})

describe('estimateMinutes', () => {
  it('rechnet Arbeit und Pause pro Satz und rundet auf 5', () => {
    expect(estimateMinutes(24, 90)).toBe(55)
  })

  it('zeigt mindestens 5 Minuten', () => {
    expect(estimateMinutes(0, 90)).toBe(5)
  })
})
